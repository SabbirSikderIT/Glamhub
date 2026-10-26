package com.glamhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Minimal signed-REST client for Cloudinary (upload, delete, download). The API secret never leaves the server. */
@Component
@Slf4j
public class CloudinaryClient {
    private static final Pattern DELIVERY = Pattern.compile("^https?://res\\.cloudinary\\.com/[^/]+/image/upload/(?:v\\d+/)?(.+?)(?:\\.[A-Za-z0-9]+)?$");

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String folder;
    private final ObjectMapper mapper = new ObjectMapper();

    public CloudinaryClient(@Value("${app.cloudinary.cloud-name:}") String cloudName,
                            @Value("${app.cloudinary.api-key:}") String apiKey,
                            @Value("${app.cloudinary.api-secret:}") String apiSecret,
                            @Value("${app.cloudinary.folder:Glamcloud}") String folder) {
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.folder = folder;
    }

    public boolean isConfigured() { return !cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank(); }

    /** True for URLs served by this Cloudinary account. */
    public boolean owns(String url) { return url != null && url.contains("res.cloudinary.com/" + cloudName + "/"); }

    private String api(String path) { return "https://api.cloudinary.com/v1_1/" + cloudName + "/image/" + path; }

    private String sign(String toSign) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-1").digest((toSign + apiSecret).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Uploads the bytes into the configured folder and returns the https delivery URL. */
    public String upload(byte[] data, String publicId) {
        long ts = System.currentTimeMillis() / 1000;
        // parameters are signed in alphabetical order, excluding file and api_key
        String signature = sign("asset_folder=" + folder + "&public_id=" + publicId + "&timestamp=" + ts);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(data) { @Override public String getFilename() { return publicId; } });
        body.add("api_key", apiKey);
        body.add("timestamp", String.valueOf(ts));
        body.add("public_id", publicId);
        body.add("asset_folder", folder);
        body.add("signature", signature);
        String res = RestClient.create().post().uri(api("upload")).contentType(MediaType.MULTIPART_FORM_DATA).body(body)
                .retrieve().body(String.class);
        try {
            JsonNode n = mapper.readTree(res);
            String url = n.path("secure_url").asText(null);
            if (url == null) throw new IllegalStateException("No secure_url in Cloudinary response");
            return url;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Unreadable Cloudinary response", e);
        }
    }

    /** Best-effort removal of an asset by its delivery URL. Never throws. */
    public void delete(String url) {
        Matcher m = DELIVERY.matcher(url == null ? "" : url);
        if (!m.matches()) return;
        String publicId = m.group(1);
        try {
            long ts = System.currentTimeMillis() / 1000;
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("public_id", publicId);
            form.add("timestamp", String.valueOf(ts));
            form.add("api_key", apiKey);
            form.add("signature", sign("public_id=" + publicId + "&timestamp=" + ts));
            RestClient.create().post().uri(api("destroy")).contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("Could not delete Cloudinary asset {}: {}", publicId, e.getMessage());
        }
    }

    public byte[] download(String url) {
        return RestClient.create().get().uri(url).retrieve().body(byte[].class);
    }
}
