package com.glamhub.service;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Directory;
import com.drew.metadata.Metadata;
import com.drew.metadata.Tag;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.FloatBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.*;

/**
 * Everything that looks at the pixels of an upload: EXIF, the local Detectra v3 AI-image detector,
 * SHA-256 and perceptual hashes for duplicate detection, and the optional AI-or-Not deep check.
 */
@Service
@Slf4j
public class ImageScreeningService {
    public record DetectraResult(String verdict, double probability) {}
    public record DeepCheck(String verdict, double confidence) {}

    private static final int SIZE = 384;
    private static final float[] MEAN = {0.485f, 0.456f, 0.406f};
    private static final float[] STD = {0.229f, 0.224f, 0.225f};

    private final String modelPath;
    private final String aiOrNotKey;
    private final ObjectMapper mapper = new ObjectMapper();
    private OrtEnvironment env;
    private OrtSession session;
    private boolean loadAttempted;

    public ImageScreeningService(@Value("${app.detectra.model-path}") String modelPath,
                                 @Value("${app.aiornot.api-key:}") String aiOrNotKey) {
        this.modelPath = modelPath;
        this.aiOrNotKey = aiOrNotKey;
    }

    // ---------- EXIF ----------
    public String readExif(byte[] data) {
        try {
            Metadata md = ImageMetadataReader.readMetadata(new ByteArrayInputStream(data));
            Map<String, String> out = new LinkedHashMap<>();
            for (Directory d : md.getDirectories()) {
                if (!d.getName().toLowerCase().contains("exif")) continue;
                for (Tag t : d.getTags()) {
                    String n = t.getTagName();
                    if (Set.of("Make", "Model", "Exposure Time", "F-Number", "ISO Speed Ratings", "Focal Length", "Date/Time Original", "Software")
                            .contains(n)) out.put(n, t.getDescription());
                }
            }
            return out.isEmpty() ? null : mapper.writeValueAsString(out);
        } catch (Exception e) {
            return null; // a missing EXIF is only a note, never an error
        }
    }

    // ---------- Detectra ----------
    public boolean detectraAvailable() { return loadSession() != null; }

    private synchronized OrtSession loadSession() {
        if (session != null || loadAttempted) return session;
        loadAttempted = true;
        try {
            Path p = Paths.get(modelPath);
            if (!Files.exists(p)) {
                log.warn("Detectra model not found at {} - uploads will wait for manual review", p.toAbsolutePath());
                return null;
            }
            env = OrtEnvironment.getEnvironment();
            session = env.createSession(p.toString(), new OrtSession.SessionOptions());
            log.info("Detectra v3 model loaded");
        } catch (Throwable t) {
            log.warn("Could not load Detectra model: {}", t.toString());
        }
        return session;
    }

    /** Returns null if the model or the image cannot be used (the photo then waits for manual review). */
    public DetectraResult detect(byte[] data) {
        OrtSession s = loadSession();
        if (s == null) return null;
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
            if (img == null) return null;
            float[] chw = preprocess(img);
            String inputName = s.getInputNames().iterator().next();
            try (OnnxTensor in = OnnxTensor.createTensor(env, FloatBuffer.wrap(chw), new long[]{1, 3, SIZE, SIZE});
                 OrtSession.Result res = s.run(Map.of(inputName, in))) {
                OnnxTensor out = (OnnxTensor) res.get(0);
                double logit = out.getFloatBuffer().get(0);
                double p = 1.0 / (1.0 + Math.exp(-logit));
                return new DetectraResult(p >= 0.5 ? "ai" : "real", p);
            }
        } catch (Throwable t) {
            log.warn("Detectra inference failed: {}", t.toString());
            return null;
        }
    }

    /** Shortest edge -> 440 (bilinear), centre-crop 384, [0,1], ImageNet-normalise, NCHW. */
    private float[] preprocess(BufferedImage src) {
        int w = src.getWidth(), h = src.getHeight();
        double scale = 440.0 / Math.min(w, h);
        int nw = Math.max(SIZE, (int) Math.round(w * scale)), nh = Math.max(SIZE, (int) Math.round(h * scale));
        BufferedImage resized = progressiveResize(src, nw, nh);
        int x0 = (nw - SIZE) / 2, y0 = (nh - SIZE) / 2;
        float[] out = new float[3 * SIZE * SIZE];
        for (int y = 0; y < SIZE; y++) {
            for (int x = 0; x < SIZE; x++) {
                int rgb = resized.getRGB(x0 + x, y0 + y);
                float r = ((rgb >> 16) & 0xFF) / 255f, g = ((rgb >> 8) & 0xFF) / 255f, b = (rgb & 0xFF) / 255f;
                int i = y * SIZE + x;
                out[i] = (r - MEAN[0]) / STD[0];
                out[SIZE * SIZE + i] = (g - MEAN[1]) / STD[1];
                out[2 * SIZE * SIZE + i] = (b - MEAN[2]) / STD[2];
            }
        }
        return out;
    }

    private BufferedImage progressiveResize(BufferedImage src, int tw, int th) {
        BufferedImage cur = toRgb(src);
        // Halve repeatedly while far larger than the target so bilinear sampling doesn't alias.
        while (cur.getWidth() / 2 >= tw && cur.getHeight() / 2 >= th) cur = scaleTo(cur, cur.getWidth() / 2, cur.getHeight() / 2);
        return scaleTo(cur, tw, th);
    }

    private BufferedImage toRgb(BufferedImage src) {
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private BufferedImage scaleTo(BufferedImage src, int w, int h) {
        BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = dst.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(src, 0, 0, w, h, null);
        g.dispose();
        return dst;
    }

    // ---------- fingerprints ----------
    public String sha256(byte[] data) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** DCT-based perceptual hash: 32x32 luminance, top-left 8x8 DCT minus DC = 63 bits vs the median. Null if undecodable. */
    public Long perceptualHash(byte[] data) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
            if (img == null) return null;
            BufferedImage small = scaleTo(progressiveResize(img, 32, 32), 32, 32);
            double[][] lum = new double[32][32];
            for (int y = 0; y < 32; y++)
                for (int x = 0; x < 32; x++) {
                    int rgb = small.getRGB(x, y);
                    lum[y][x] = 0.299 * ((rgb >> 16) & 0xFF) + 0.587 * ((rgb >> 8) & 0xFF) + 0.114 * (rgb & 0xFF);
                }
            double[] coeffs = new double[63];
            int k = 0;
            for (int u = 0; u < 8; u++)
                for (int v = 0; v < 8; v++) {
                    if (u == 0 && v == 0) continue;
                    double sum = 0;
                    for (int y = 0; y < 32; y++)
                        for (int x = 0; x < 32; x++)
                            sum += lum[y][x] * Math.cos((2 * x + 1) * v * Math.PI / 64) * Math.cos((2 * y + 1) * u * Math.PI / 64);
                    coeffs[k++] = sum;
                }
            double[] sorted = coeffs.clone();
            Arrays.sort(sorted);
            double median = sorted[31];
            long hash = 0;
            for (int i = 0; i < 63; i++) if (coeffs[i] > median) hash |= (1L << i);
            return hash;
        } catch (Exception e) {
            return null;
        }
    }

    public static int hamming(long a, long b) { return Long.bitCount(a ^ b); }

    // ---------- AI-or-Not deep check ----------
    public boolean deepCheckAvailable() { return aiOrNotKey != null && !aiOrNotKey.isBlank(); }

    public DeepCheck deepCheck(byte[] data, String filename) {
        if (!deepCheckAvailable()) return null;
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("object", new ByteArrayResource(data) {
                @Override public String getFilename() { return filename; }
            });
            String json = RestClient.create().post().uri("https://api.aiornot.com/v1/reports/image")
                    .header("Authorization", "Bearer " + aiOrNotKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA).body(body).retrieve().body(String.class);
            JsonNode root = mapper.readTree(json);
            JsonNode report = root.has("report") ? root.get("report") : root;
            String verdict = firstText(report, "verdict");
            double conf = 0;
            JsonNode ai = report.path("ai");
            if (ai.has("confidence")) conf = ai.get("confidence").asDouble();
            else if (report.has("confidence")) conf = report.get("confidence").asDouble();
            if (verdict == null) verdict = ai.path("is_detected").asBoolean(false) ? "ai" : "human";
            return new DeepCheck(verdict, conf);
        } catch (Exception e) {
            log.warn("AI-or-Not check failed: {}", e.getMessage());
            return null;
        }
    }

    private String firstText(JsonNode n, String field) {
        if (n.has(field) && n.get(field).isTextual()) return n.get(field).asText();
        for (JsonNode c : n) {
            if (c.isObject()) { String r = firstText(c, field); if (r != null) return r; }
        }
        return null;
    }

    @PreDestroy
    void close() {
        try { if (session != null) session.close(); } catch (Exception ignored) { }
    }
}
