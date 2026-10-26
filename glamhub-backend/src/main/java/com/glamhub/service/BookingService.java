package com.glamhub.service;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Account.OtpVerification;
import com.glamhub.model.Business.*;
import com.glamhub.model.Enums.*;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import com.glamhub.util.CurrentUser;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {
    private static final SecureRandom RNG = new SecureRandom();
    private static final List<String> SLOTS = List.of("08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM",
            "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM");

    private final BookingRepository bookings;
    private final UserRepository users;
    private final PackageRepository packages;
    private final AvailabilityRepository availability;
    private final OtpRepository otps;
    private final ReviewRepository reviews;
    private final BookingTxRepository txs;
    private final SettingsService settings;
    private final MainAdminGuard mainAdmin;
    private final MailService mail;

    @Value("${app.frontend-url}") private String frontendUrl;
    @Value("${app.sms.textbelt-key}") private String textbeltKey;

    public static List<String> slots() { return SLOTS; }

    public BookingDto toDto(Booking b) {
        return new BookingDto(b.getId(), b.getArtist().getId(), b.getArtist().getName(), b.getServicePackage().getId(),
                b.getServicePackage().getTitle(), b.getServicePackage().getPrice(), b.getClientName(), b.getClientPhone(),
                b.getClientEmail(), b.getBookingDate(), b.getTimeSlot(), b.getStatus(), b.isOtpVerified(), b.getVerificationMethod(),
                b.getDepositAmount(), b.getDepositPercent(), b.isDepositPaid(), reviews.findByBookingId(b.getId()).isPresent(), b.getCreatedAt());
    }

    // ---------- access ----------
    /** A booking can be read/acted on by its secret key (guests), its artist, its customer, or staff. */
    public Booking authorized(Long id, String key) {
        Booking b = bookings.findById(id).orElseThrow(() -> ApiException.notFound("We couldn't find that booking."));
        User u = CurrentUser.orNull();
        boolean ok = (key != null && !key.isBlank() && key.equals(b.getAccessKey()))
                || (u != null && (u.getId().equals(b.getArtist().getId())
                    || (b.getCustomer() != null && u.getId().equals(b.getCustomer().getId()))
                    || u.getRole() == Role.ADMIN || u.getRole() == Role.MODERATOR));
        if (!ok) throw ApiException.notFound("We couldn't find that booking.");
        return b;
    }

    // ---------- create ----------
    @Transactional
    public BookingCreated create(BookingCreateRequest r) {
        User artist = users.findById(r.artistId()).filter(u -> u.getRole() == Role.ARTIST && u.isEnabled())
                .orElseThrow(() -> ApiException.notFound("We couldn't find that makeup artist."));
        ServicePackage pkg = packages.findById(r.packageId())
                .filter(p -> p.getArtist().getId().equals(artist.getId()))
                .orElseThrow(() -> ApiException.badRequest("That package isn't offered by this artist."));
        if (r.bookingDate().isBefore(LocalDate.now())) throw ApiException.badRequest("Please choose a date that hasn't passed yet.");
        if (r.timeSlot() != null && !r.timeSlot().isBlank() && !SLOTS.contains(r.timeSlot()))
            throw ApiException.badRequest("Please choose one of the available time slots.");

        Availability a = availability.findByArtistIdAndDate(artist.getId(), r.bookingDate()).orElse(null);
        if (a != null && a.getStatus() != AvailabilityStatus.FREE) throw ApiException.conflict("Sorry, that date isn't available. Please pick another.");
        if (a == null) a = Availability.builder().artist(artist).date(r.bookingDate()).build();
        a.setStatus(AvailabilityStatus.BOOKED);
        try {
            availability.saveAndFlush(a);
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("Sorry, that date was just taken. Please pick another.");
        }

        BigDecimal percent = settings.depositPercent();
        BigDecimal deposit = pkg.getPrice().multiply(percent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        String key = UUID.randomUUID().toString().replace("-", "");
        Booking b = bookings.save(Booking.builder().artist(artist).servicePackage(pkg).customer(CurrentUser.orNull())
                .clientName(r.clientName().trim()).clientPhone(r.clientPhone().trim()).clientEmail(r.clientEmail().trim())
                .bookingDate(r.bookingDate()).timeSlot(r.timeSlot()).depositAmount(deposit).depositPercent(percent)
                .accessKey(key).build());
        return new BookingCreated(toDto(b), key);
    }

    // ---------- verification ----------
    @Transactional
    public VerificationStartResponse startVerification(Long id, String key, VerificationMethod method) {
        Booking b = authorized(id, key);
        if (b.isOtpVerified()) throw ApiException.conflict("This booking is already verified.");
        if (b.getStatus() == BookingStatus.CANCELLED) throw ApiException.conflict("This booking was cancelled.");
        b.setVerificationMethod(method);
        b.setQrVerificationToken(null);
        b.setTotpSecret(null);
        String contactKey = "booking:" + id;
        otps.deleteByContact(contactKey);

        VerificationStartResponse res;
        switch (method) {
            case PHONE_OTP -> {
                String code = newCode();
                saveOtp(contactKey, code);
                boolean sent = sendSms(b.getClientPhone(), "Your GlamHub booking code is " + code);
                res = new VerificationStartResponse(method, sent ? "We texted a code to your phone." :
                        "SMS couldn't be delivered to this number, so your code is shown here instead.", sent ? null : code, null, null, null);
            }
            case EMAIL_OTP -> {
                String code = newCode();
                saveOtp(contactKey, code);
                boolean sent = mail.send(b.getClientEmail(), "Your GlamHub booking code",
                        "Hi " + b.getClientName() + ",\n\nYour GlamHub booking verification code is " + code + ". It expires in 10 minutes.\n\n- GlamHub");
                res = new VerificationStartResponse(method, sent ? "We emailed a code to " + b.getClientEmail() + "." :
                        "Email isn't configured on this server yet, so your code is shown here instead.", sent ? null : code, null, null, null);
            }
            case QR_CODE -> {
                String token = UUID.randomUUID().toString().replace("-", "");
                b.setQrVerificationToken(token);
                res = new VerificationStartResponse(method, "Ask your makeup artist to show you their QR code and scan it with your phone.", null, null, null, null);
            }
            case TOTP -> {
                GoogleAuthenticatorKey creds = new GoogleAuthenticator().createCredentials();
                b.setTotpSecret(creds.getKey());
                // The QR must carry the raw otpauth://totp/... URI, not a link to a third-party image generator.
                String uri = GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL("GlamHub", b.getClientEmail(), creds);
                res = new VerificationStartResponse(method, "Scan this with Google Authenticator, then enter the 6-digit code.", null, uri, creds.getKey(), qrDataUrl(uri));
            }
            default -> throw ApiException.badRequest("Unknown verification method.");
        }
        bookings.save(b);
        return res;
    }

    private String newCode() { return String.format("%06d", RNG.nextInt(1_000_000)); }

    private void saveOtp(String contact, String code) {
        otps.save(OtpVerification.builder().contact(contact).code(code).expiresAt(Instant.now().plusSeconds(600)).build());
    }

    @Transactional
    public BookingDto confirmCode(Long id, String key, String code) {
        Booking b = authorized(id, key);
        if (b.isOtpVerified()) return toDto(b);
        String c = code == null ? "" : code.trim();
        boolean ok = false;
        if (b.getVerificationMethod() == VerificationMethod.TOTP && b.getTotpSecret() != null) {
            try { ok = new GoogleAuthenticator().authorize(b.getTotpSecret(), Integer.parseInt(c)); } catch (NumberFormatException ignored) { }
        } else if (b.getVerificationMethod() == VerificationMethod.PHONE_OTP || b.getVerificationMethod() == VerificationMethod.EMAIL_OTP) {
            OtpVerification o = otps.findFirstByContactOrderByIdDesc("booking:" + id).orElse(null);
            ok = o != null && o.getExpiresAt().isAfter(Instant.now()) && o.getCode().equals(c);
            if (ok) otps.deleteByContact("booking:" + id);
        } else {
            throw ApiException.badRequest("Please choose a verification method first.");
        }
        if (!ok) throw ApiException.badRequest("That code isn't right or has expired.");
        b.setOtpVerified(true);
        return toDto(bookings.save(b));
    }

    /** The client scans the artist's QR code; the token itself is the secret. */
    @Transactional
    public BookingDto verifyQr(String token) {
        Booking b = bookings.findByQrVerificationToken(token).orElseThrow(() -> ApiException.notFound("This QR code isn't valid any more."));
        b.setOtpVerified(true);
        return toDto(bookings.save(b));
    }

    public Map<String, String> qrForArtist(User artist, Long id) {
        Booking b = bookings.findById(id).filter(x -> x.getArtist().getId().equals(artist.getId()))
                .orElseThrow(() -> ApiException.notFound("We couldn't find that booking."));
        if (b.getVerificationMethod() != VerificationMethod.QR_CODE || b.getQrVerificationToken() == null)
            throw ApiException.badRequest("This client hasn't chosen QR verification.");
        String url = frontendUrl.replaceAll("/+$", "") + "/verify-booking/" + b.getQrVerificationToken();
        return Map.of("url", url, "qrImage", qrDataUrl(url));
    }

    // ---------- status ----------
    @Transactional
    public BookingDto updateStatus(User artist, Long id, BookingStatus next) {
        Booking b = bookings.findById(id).filter(x -> x.getArtist().getId().equals(artist.getId()))
                .orElseThrow(() -> ApiException.notFound("We couldn't find that booking."));
        BookingStatus cur = b.getStatus();
        boolean allowed = (cur == BookingStatus.PENDING && (next == BookingStatus.CONFIRMED || next == BookingStatus.CANCELLED))
                || (cur == BookingStatus.CONFIRMED && (next == BookingStatus.COMPLETED || next == BookingStatus.CANCELLED));
        if (!allowed) throw ApiException.conflict("A " + cur.name().toLowerCase() + " booking can't be changed to " + next.name().toLowerCase() + ".");
        if (next == BookingStatus.CONFIRMED && !(b.isOtpVerified() && b.isDepositPaid()))
            throw ApiException.conflict("The client must verify the booking and pay the deposit before you can confirm it.");
        if (next == BookingStatus.COMPLETED && b.getBookingDate().isAfter(LocalDate.now()))
            throw ApiException.conflict("You can mark a booking complete on or after the session date.");
        b.setStatus(next);
        if (next == BookingStatus.CANCELLED) freeDate(b);
        return toDto(bookings.save(b));
    }

    private void freeDate(Booking b) {
        availability.findByArtistIdAndDate(b.getArtist().getId(), b.getBookingDate()).ifPresent(a -> {
            a.setStatus(AvailabilityStatus.FREE);
            availability.save(a);
        });
    }

    public List<BookingDto> forArtist(User artist) {
        return bookings.findByArtistIdOrderByBookingDateDesc(artist.getId()).stream().map(this::toDto).toList();
    }

    public List<BookingDto> forCustomer(User u) {
        return bookings.findByCustomerIdOrderByBookingDateDesc(u.getId()).stream().map(this::toDto).toList();
    }

    /** Releases dates held by bookings that were never verified/paid. */
    @Scheduled(fixedDelay = 600_000, initialDelay = 120_000)
    @Transactional
    public void releaseAbandoned() {
        Instant cutoff = Instant.now().minusSeconds(2 * 3600);
        for (Booking b : bookings.findAll()) {
            if (b.getStatus() == BookingStatus.PENDING && !b.isDepositPaid() && b.getCreatedAt().isBefore(cutoff)) {
                b.setStatus(BookingStatus.CANCELLED);
                freeDate(b);
                bookings.save(b);
            }
        }
    }

    // ---------- helpers ----------
    private boolean sendSms(String phone, String text) {
        String digits = phone.replaceAll("[^0-9]", "");
        String e164 = digits.startsWith("880") ? "+" + digits : digits.startsWith("0") ? "+88" + digits : "+880" + digits;
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("phone", e164);
            form.add("message", text);
            form.add("key", textbeltKey);
            Map<?, ?> res = RestClient.create().post().uri("https://textbelt.com/text")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(Map.class);
            return res != null && Boolean.TRUE.equals(res.get("success"));
        } catch (Exception e) {
            log.warn("SMS failed: {}", e.getMessage());
            return false;
        }
    }

    public static String qrDataUrl(String content) {
        try {
            BitMatrix m = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 360, 360);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(m, "PNG", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("QR generation failed", e);
        }
    }
}
