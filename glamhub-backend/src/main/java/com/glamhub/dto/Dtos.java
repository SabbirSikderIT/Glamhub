package com.glamhub.dto;

import com.glamhub.model.Enums.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Request / response records for the whole API. */
public final class Dtos {
    private Dtos() {}

    // ---------- auth ----------
    public record RegisterArtistRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank @Email(message = "Enter a valid email") String email,
            @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String password,
            String phone,
            @NotBlank(message = "Please choose your district") String district,
            BudgetTier budgetTier) {}

    public record RegisterCustomerRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank @Email(message = "Enter a valid email") String email,
            @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String password,
            String phone) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String token, Long userId, String name, String email, Role role, String profilePhotoUrl, boolean mainAdmin) {}
    public record EmailRequest(@NotBlank @Email String email) {}
    public record VerifyResetOtpRequest(@NotBlank String email, @NotBlank String otp) {}
    public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String newPassword) {}
    public record PasswordRequest(@NotBlank(message = "Password is required") String password) {}

    // ---------- artists ----------
    public record ArtistSummary(Long id, String name, String profilePhotoUrl, String location, String bio,
                                BudgetTier budgetTier, int yearsExperience, double ratingAvg, int totalReviews,
                                boolean hasBlueBadge, boolean verified, Long minPrice) {}

    public record ArtistDetail(Long id, String name, String email, String phone, String profilePhotoUrl, String location,
                               String bio, BudgetTier budgetTier, int yearsExperience, double ratingAvg, int totalReviews,
                               boolean hasBlueBadge, boolean verified) {}

    public record ArtistUpdateRequest(@NotBlank String name, String bio, String phone, String baseLocation,
                                      @Min(0) @Max(80) Integer yearsExperience, BudgetTier budgetTier) {}

    public record PageResponse<T>(List<T> items, int page, int size, long total, boolean hasMore) {}

    // ---------- packages ----------
    public record PackageRequest(@NotBlank(message = "Title is required") String title, String description,
                                 @NotNull @DecimalMin(value = "1", message = "Price must be at least 1") BigDecimal price,
                                 @Min(1) int durationHours, String includes) {}
    public record PackageDto(Long id, String title, String description, BigDecimal price, int durationHours, String includes) {}

    // ---------- portfolio ----------
    public record PortfolioDto(Long id, String imageUrl, PortfolioCategory category, String caption,
                               VerificationStatus verificationStatus, String rejectionReason, Instant createdAt,
                               Long artistId, String artistName) {}
    public record AdminPhotoDto(Long id, String imageUrl, PortfolioCategory category, String caption,
                                VerificationStatus verificationStatus, String flagReason, String rejectionReason,
                                String detectraVerdict, Double detectraConfidence, String aiCheckVerdict,
                                Double aiCheckConfidence, Long artistId, String artistName, Instant createdAt) {}

    // ---------- availability ----------
    public record AvailabilityDto(LocalDate date, AvailabilityStatus status) {}
    public record AvailabilityUpdate(@NotNull AvailabilityStatus status) {}

    // ---------- bookings ----------
    public record BookingCreateRequest(@NotNull Long artistId, @NotNull Long packageId, @NotNull LocalDate bookingDate,
                                       String timeSlot,
                                       @NotBlank(message = "Your name is required") String clientName,
                                       @NotBlank(message = "Your phone number is required") String clientPhone,
                                       @NotBlank @Email(message = "Enter a valid email") String clientEmail) {}
    public record VerificationMethodRequest(@NotNull VerificationMethod method) {}
    public record ConfirmOtpRequest(@NotBlank String code) {}
    public record StatusRequest(@NotNull BookingStatus status) {}
    public record BookingDto(Long id, Long artistId, String artistName, Long packageId, String packageTitle,
                             BigDecimal packagePrice, String clientName, String clientPhone, String clientEmail,
                             LocalDate bookingDate, String timeSlot, BookingStatus status, boolean verified,
                             VerificationMethod verificationMethod, BigDecimal depositAmount, BigDecimal depositPercent,
                             boolean depositPaid, boolean reviewed, Instant createdAt) {}
    public record BookingCreated(BookingDto booking, String accessKey) {}
    public record VerificationStartResponse(VerificationMethod method, String message, String devCode, String totpSetupUri, String totpSecret, String qrImage) {}
    public record PaymentInitResponse(String gatewayUrl, String tranId) {}

    // ---------- reviews ----------
    public record ReviewCreateRequest(@NotNull Long bookingId, @Min(1) @Max(5) int rating, @Size(max = 1500) String comment) {}
    public record ReplyRequest(@NotBlank(message = "Reply can't be empty") @Size(max = 1500) String reply) {}
    public record ReviewDto(Long id, Long bookingId, Long artistId, String artistName, String clientName, int rating, String comment,
                            ReviewStatus status, String artistReply, Instant repliedAt, Instant createdAt) {}

    // ---------- badge / settings ----------
    public record PriceRequest(@NotNull @DecimalMin(value = "1", message = "Price must be at least 1") BigDecimal price) {}
    public record PercentRequest(@NotNull BigDecimal percent) {}

    // ---------- content ----------
    public record PaletteRequest(@NotBlank String name, String occasion, String skinTone, String description,
                                 @NotBlank(message = "Add at least one colour") String swatches, String swatchNames, String tips) {}
    public record LookRequest(@NotNull LookLevel level, @NotBlank String title, String description, String steps,
                              String bestFor, String products, String lipColor, String eyeColor, String blushColor) {}

    // ---------- staff / account ----------
    public record StaffRequest(@NotBlank String name, @NotBlank @Email String email,
                               @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String password,
                               @NotNull Role role) {}
    public record AccountDto(Long id, Role role, String name, String email, String phone, String location, String bio, String profilePhotoUrl) {}
    public record AccountUpdateRequest(@NotBlank String name, String phone, String location, String bio) {}
    public record DeletionRequestBody(@Size(max = 1000) String reason) {}
    public record AdminNoteRequest(@Size(max = 1000) String note) {}

    // ---------- AI ----------
    public record ChatTurn(@NotBlank String role, @NotBlank String content) {}
    public record AiChatRequest(Long conversationId, @NotBlank(message = "Say something first") String message, List<ChatTurn> history, String mode) {}
    public record ChatbotRequest(@NotBlank String message, List<ChatTurn> history) {}
}
