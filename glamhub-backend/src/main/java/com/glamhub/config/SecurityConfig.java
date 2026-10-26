package com.glamhub.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception {
        return c.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(c -> c.disable())
            .cors(c -> c.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> writeJson(res, 401, "Please log in to continue."))
                .accessDeniedHandler((req, res, ex) -> writeJson(res, 403, "You don't have access to do that.")))
            .authorizeHttpRequests(a -> a
                // order matters: first match wins
                .requestMatchers("/api/auth/**", "/api/otp/**", "/uploads/**", "/api/chatbot/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/ai-chat/messages", "/api/ai-chat/transcribe").permitAll()
                .requestMatchers("/api/ai-chat/**").authenticated()
                .requestMatchers("/api/blue-badge/payment/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/artists/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/artists/**", "/api/reviews", "/api/palettes", "/api/looks",
                        "/api/showcase", "/api/booking-money/public").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/bookings").permitAll()
                .requestMatchers("/api/bookings/payment/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/bookings/mine", "/api/bookings/artist").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/bookings/*/verification-method", "/api/bookings/*/confirm-otp",
                        "/api/bookings/*/deposit/initiate", "/api/bookings/verify-qr/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/bookings/*").permitAll() // gated by the booking access key in the service
                .requestMatchers(HttpMethod.POST, "/api/reviews").permitAll()   // gated by the booking access key in the service
                .requestMatchers("/api/admin/staff/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "MODERATOR")
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void writeJson(jakarta.servlet.http.HttpServletResponse res, int status, String message) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        // Payment gateways post from their own domain; these routes need open CORS and must be registered first.
        CorsConfiguration open = new CorsConfiguration();
        open.setAllowedOriginPatterns(List.of("*"));
        open.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        open.setAllowedHeaders(List.of("*"));
        open.setAllowCredentials(false);

        CorsConfiguration app = new CorsConfiguration();
        app.setAllowedOriginPatterns(List.of(
                "http://localhost:*", "http://127.0.0.1:*",
                "http://192.168.*.*:*", "http://10.*.*.*:*", "http://172.16.*.*:*"));
        app.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        app.setAllowedHeaders(List.of("*"));
        app.setAllowCredentials(true);

        Map<String, CorsConfiguration> map = new LinkedHashMap<>();
        map.put("/api/bookings/payment/**", open);
        map.put("/api/blue-badge/payment/**", open);
        map.put("/**", app);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        map.forEach(src::registerCorsConfiguration);
        return src;
    }
}
