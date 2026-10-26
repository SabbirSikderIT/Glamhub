package com.glamhub.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

/** Thin client for the SSLCommerz hosted-payment API. */
@Component
@Slf4j
public class SslCommerzClient {
    public record Validation(boolean valid, String tranId, BigDecimal amount) {}

    private final String storeId;
    private final String storePassword;
    private final String host;
    private final ObjectMapper mapper = new ObjectMapper();

    public SslCommerzClient(@Value("${app.sslcommerz.store-id:}") String storeId,
                            @Value("${app.sslcommerz.store-password:}") String storePassword,
                            @Value("${app.sslcommerz.sandbox:true}") boolean sandbox) {
        this.storeId = storeId;
        this.storePassword = storePassword;
        this.host = sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
    }

    public boolean isConfigured() { return !storeId.isBlank() && !storePassword.isBlank(); }

    /** Returns the hosted payment page URL, or null if the gateway refused or is unreachable. */
    public String init(String tranId, BigDecimal amount, String customerName, String email, String phone, String product,
                       String successUrl, String failUrl, String cancelUrl) {
        if (!isConfigured()) return null;
        try {
            MultiValueMap<String, String> f = new LinkedMultiValueMap<>();
            f.add("store_id", storeId);
            f.add("store_passwd", storePassword);
            f.add("total_amount", amount.toPlainString());
            f.add("currency", "BDT");
            f.add("tran_id", tranId);
            f.add("success_url", successUrl);
            f.add("fail_url", failUrl);
            f.add("cancel_url", cancelUrl);
            f.add("cus_name", customerName);
            f.add("cus_email", email);
            f.add("cus_add1", "Bangladesh");
            f.add("cus_city", "Dhaka");
            f.add("cus_country", "Bangladesh");
            f.add("cus_phone", phone == null || phone.isBlank() ? "01700000000" : phone);
            f.add("shipping_method", "NO");
            f.add("product_name", product);
            f.add("product_category", "Beauty services");
            f.add("product_profile", "general");
            String body = RestClient.create().post().uri(host + "/gwprocess/v4/api.php")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(f).retrieve().body(String.class);
            JsonNode n = mapper.readTree(body);
            if ("SUCCESS".equalsIgnoreCase(n.path("status").asText())) return n.path("GatewayPageURL").asText(null);
            log.warn("SSLCommerz init refused: {}", n.path("failedreason").asText(body));
        } catch (Exception e) {
            log.warn("SSLCommerz init failed: {}", e.getMessage());
        }
        return null;
    }

    /** Server-to-server confirmation. The browser redirect is never trusted on its own. */
    public Validation validate(String valId) {
        if (!isConfigured() || valId == null || valId.isBlank()) return new Validation(false, null, null);
        try {
            String body = RestClient.create().get().uri(host + "/validator/api/validationserverAPI.php?val_id={v}&store_id={s}&store_passwd={p}&format=json",
                    valId, storeId, storePassword).retrieve().body(String.class);
            JsonNode n = mapper.readTree(body);
            String status = n.path("status").asText("");
            boolean ok = status.equals("VALID") || status.equals("VALIDATED");
            BigDecimal amount = n.hasNonNull("amount") ? new BigDecimal(n.get("amount").asText()) : null;
            return new Validation(ok, n.path("tran_id").asText(null), amount);
        } catch (Exception e) {
            log.warn("SSLCommerz validation failed: {}", e.getMessage());
            return new Validation(false, null, null);
        }
    }
}
