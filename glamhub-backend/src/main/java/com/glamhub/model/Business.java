package com.glamhub.model;

import com.glamhub.model.Enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Packages, availability, bookings, payments, reviews and the blue badge. */
public final class Business {
    private Business() {}

    @Entity(name = "ServicePackage") @Table(name = "packages")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ServicePackage {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private User artist;
        @Column(nullable = false) private String title;
        @Column(length = 1500) private String description;
        @Column(nullable = false, precision = 10, scale = 2) private BigDecimal price;
        private int durationHours;
        /** What the client gets, e.g. "HD base, lashes, hair styling". */
        @Column(length = 500) private String includes;
    }

    @Entity(name = "Availability")
    @Table(name = "availability", uniqueConstraints = @UniqueConstraint(columnNames = {"artist_id", "date"}))
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Availability {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private User artist;
        @Column(nullable = false) private LocalDate date;
        @Enumerated(EnumType.STRING) @Column(nullable = false) private AvailabilityStatus status;
    }

    @Entity(name = "Booking") @Table(name = "bookings")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Booking {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private User artist;
        @ManyToOne(optional = false) private ServicePackage servicePackage;
        /** Null for guest bookings. */
        @ManyToOne private User customer;
        @Column(nullable = false) private String clientName;
        @Column(nullable = false) private String clientPhone;
        @Column(nullable = false) private String clientEmail;
        @Column(nullable = false) private LocalDate bookingDate;
        private String timeSlot;
        @Enumerated(EnumType.STRING) @Builder.Default private BookingStatus status = BookingStatus.PENDING;
        /** True once any verification method succeeded. */
        @Builder.Default private boolean otpVerified = false;
        @Enumerated(EnumType.STRING) private VerificationMethod verificationMethod;
        /** Unguessable key the guest client holds; required to read or act on a booking without logging in. */
        @Column(unique = true) private String accessKey;
        @Column(unique = true) private String qrVerificationToken;
        private String totpSecret;
        @Column(precision = 10, scale = 2) private BigDecimal depositAmount;
        @Column(precision = 5, scale = 2, columnDefinition = "numeric(5,2) default 10") private BigDecimal depositPercent;
        @Builder.Default private boolean depositPaid = false;
        @Builder.Default private Instant createdAt = Instant.now();
    }

    @Entity(name = "BookingPaymentTransaction") @Table(name = "booking_payment_transactions")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BookingPaymentTransaction {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private String tranId;
        @ManyToOne(optional = false) private Booking booking;
        @Column(precision = 10, scale = 2) private BigDecimal amount;
        private String currency;
        @Enumerated(EnumType.STRING) @Builder.Default private PaymentStatus status = PaymentStatus.PENDING;
        @Builder.Default private Instant createdAt = Instant.now();
        private Instant validatedAt;
    }

    @Entity(name = "BookingMoneySettings") @Table(name = "booking_money_settings")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BookingMoneySettings {
        @Id private Long id;
        @Column(precision = 5, scale = 2) private BigDecimal depositPercent;
        private Instant updatedAt;
    }

    @Entity(name = "Review") @Table(name = "reviews")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Review {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @OneToOne(optional = false) @JoinColumn(name = "booking_id", unique = true) private Booking booking;
        @ManyToOne(optional = false) private User artist;
        private String clientName;
        private int rating;
        @Column(length = 2000) private String comment;
        @Enumerated(EnumType.STRING) @Builder.Default private ReviewStatus status = ReviewStatus.APPROVED;
        @Column(length = 2000) private String artistReply;
        private Instant repliedAt;
        @Builder.Default private Instant createdAt = Instant.now();
    }

    @Entity(name = "BlueBadge") @Table(name = "blue_badges")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BlueBadge {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @OneToOne(optional = false) @JoinColumn(name = "artist_id", unique = true) private User artist;
        @Column(precision = 10, scale = 2) private BigDecimal amountPaid;
        private Instant purchasedAt;
        private boolean active;
    }

    @Entity(name = "BlueBadgeSettings") @Table(name = "blue_badge_settings")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BlueBadgeSettings {
        @Id private Long id;
        @Column(precision = 10, scale = 2) private BigDecimal price;
        private Instant updatedAt;
    }

    @Entity(name = "BlueBadgeTransaction") @Table(name = "blue_badge_transactions")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BlueBadgeTransaction {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private String tranId;
        @ManyToOne(optional = false) private User artist;
        @Column(precision = 10, scale = 2) private BigDecimal amount;
        private String currency;
        @Enumerated(EnumType.STRING) @Builder.Default private PaymentStatus status = PaymentStatus.PENDING;
        @Builder.Default private Instant createdAt = Instant.now();
        private Instant validatedAt;
    }
}
