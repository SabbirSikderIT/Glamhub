package com.glamhub.model;

import com.glamhub.model.Enums.DeletionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Small account-related entities kept together: banned emails, reset tokens, OTPs, deletion requests. */
public final class Account {
    private Account() {}

    @Entity(name = "BannedEmail") @Table(name = "banned_emails")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BannedEmail {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private String email;
    }

    @Entity(name = "PasswordResetToken") @Table(name = "password_reset_tokens")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PasswordResetToken {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private String token;
        @ManyToOne(optional = false) private User user;
        private Instant expiresAt;
        private boolean used;
    }

    @Entity(name = "OtpVerification") @Table(name = "otp_verifications")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OtpVerification {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false) private String contact;
        @Column(nullable = false) private String code;
        private Instant expiresAt;
        private boolean verified;
    }

    @Entity(name = "DeletionRequest") @Table(name = "account_deletion_requests")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeletionRequest {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @OneToOne(optional = false) @JoinColumn(name = "user_id", unique = true) private User user;
        @Column(length = 1000) private String reason;
        @Enumerated(EnumType.STRING) @Builder.Default private DeletionStatus status = DeletionStatus.PENDING;
        @Column(length = 1000) private String adminNote;
        @Builder.Default private Instant createdAt = Instant.now();
        private Instant resolvedAt;
    }
}
