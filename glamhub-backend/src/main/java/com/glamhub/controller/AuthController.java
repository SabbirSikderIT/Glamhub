package com.glamhub.controller;

import com.glamhub.dto.Dtos.*;
import com.glamhub.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerArtist(@Valid @RequestBody RegisterArtistRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerArtist(r));
    }

    @PostMapping("/register-customer")
    public ResponseEntity<AuthResponse> registerCustomer(@Valid @RequestBody RegisterCustomerRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerCustomer(r));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) { return auth.login(r, false); }

    @PostMapping("/admin-login")
    public AuthResponse adminLogin(@Valid @RequestBody LoginRequest r) { return auth.login(r, true); }

    /** The answer is identical whether or not the email exists. */
    @PostMapping("/forgot-password")
    public Map<String, String> forgot(@Valid @RequestBody EmailRequest r) {
        auth.forgotPassword(r.email());
        return Map.of("message", "If that email is registered, we've sent a 6-digit code to it.");
    }

    @PostMapping("/verify-reset-otp")
    public Map<String, String> verifyOtp(@Valid @RequestBody VerifyResetOtpRequest r) {
        return Map.of("resetToken", auth.verifyResetOtp(r));
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetPasswordRequest r) {
        auth.resetPassword(r);
        return Map.of("message", "Your password has been updated. You can log in now.");
    }
}
