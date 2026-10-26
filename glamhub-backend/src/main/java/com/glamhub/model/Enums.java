package com.glamhub.model;

public final class Enums {
    private Enums() {}

    public enum Role { ARTIST, CUSTOMER, ADMIN, MODERATOR }
    public enum BudgetTier { LOW, MEDIUM, HIGH }
    public enum AvailabilityStatus { FREE, BOOKED, BLOCKED }
    public enum BookingStatus { PENDING, CONFIRMED, COMPLETED, CANCELLED }
    public enum VerificationMethod { PHONE_OTP, EMAIL_OTP, QR_CODE, TOTP }
    public enum PaymentStatus { PENDING, VALID, FAILED, CANCELLED }
    public enum ReviewStatus { APPROVED, REJECTED }
    public enum PortfolioCategory { BRIDAL, CASUAL, PARTY, EDITORIAL }
    public enum VerificationStatus { PENDING, VERIFIED, FLAGGED }
    public enum DeletionStatus { PENDING, REJECTED }
    public enum LookLevel { LIGHT, MEDIUM, HEAVY }
}
