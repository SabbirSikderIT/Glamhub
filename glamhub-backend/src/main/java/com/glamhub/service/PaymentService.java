package com.glamhub.service;

import com.glamhub.dto.Dtos.PaymentInitResponse;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Business.*;
import com.glamhub.model.Enums.PaymentStatus;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.ArtistProfile;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import com.glamhub.service.SslCommerzClient.Validation;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * The payment pattern, written once and reused for booking deposits and the blue badge:
 * reserve first (pending transaction), never trust the redirect, confirm server-to-server, release on failure.
 */
@Service
@RequiredArgsConstructor
public class PaymentService {
    private final SslCommerzClient gateway;
    private final BookingRepository bookings;
    private final BookingTxRepository bookingTxs;
    private final BlueBadgeRepository badges;
    private final BlueBadgeTxRepository badgeTxs;
    private final ArtistProfileRepository profiles;
    private final UserRepository users;
    private final SettingsService settings;

    @Value("${app.base-url}") private String baseUrl;
    @Value("${app.frontend-url}") private String frontendUrl;

    private String api(String path) { return baseUrl.replaceAll("/+$", "") + "/api" + path; }
    private String front(String path) { return frontendUrl.replaceAll("/+$", "") + path; }
    private String newTranId(String prefix) { return prefix + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmss")) + UUID.randomUUID().toString().substring(0, 6).toUpperCase(); }

    // ---------- booking deposit ----------
    @Transactional
    public PaymentInitResponse initiateDeposit(Booking b) {
        if (b.isDepositPaid()) throw ApiException.conflict("The deposit for this booking is already paid.");
        if (!b.isOtpVerified()) throw ApiException.conflict("Please verify your booking before paying the deposit.");
        if (b.getStatus() == com.glamhub.model.Enums.BookingStatus.CANCELLED) throw ApiException.conflict("This booking was cancelled.");
        String tranId = newTranId("BK");
        bookingTxs.save(BookingPaymentTransaction.builder().tranId(tranId).booking(b).amount(b.getDepositAmount()).currency("BDT").build());
        String url = gateway.init(tranId, b.getDepositAmount(), b.getClientName(), b.getClientEmail(), b.getClientPhone(),
                "Makeup booking deposit #" + b.getId(), api("/bookings/payment/success"), api("/bookings/payment/fail"), api("/bookings/payment/cancel"));
        if (url == null) throw ApiException.badRequest("Online payment isn't available right now. Please try again shortly.");
        return new PaymentInitResponse(url, tranId);
    }

    /** Returns the frontend URL to send the browser to. */
    @Transactional
    public String bookingCallback(String tranId, String valId, String outcome) {
        BookingPaymentTransaction tx = tranId == null ? null : bookingTxs.findByTranId(tranId).orElse(null);
        if (tx == null) return front("/");
        Booking b = tx.getBooking();
        String result = "failed";
        if (tx.getStatus() == PaymentStatus.VALID) {
            result = "success";
        } else if ("success".equals(outcome)) {
            if (confirmed(valId, tx.getTranId(), tx.getAmount())) {
                tx.setStatus(PaymentStatus.VALID);
                tx.setValidatedAt(Instant.now());
                b.setDepositPaid(true);
                bookings.save(b);
                result = "success";
            } else {
                tx.setStatus(PaymentStatus.FAILED);
            }
        } else if ("cancel".equals(outcome)) {
            if (tx.getStatus() == PaymentStatus.PENDING) tx.setStatus(PaymentStatus.CANCELLED);
            result = "cancelled";
        } else if (tx.getStatus() == PaymentStatus.PENDING) {
            tx.setStatus(PaymentStatus.FAILED);
        }
        bookingTxs.save(tx);
        return front("/book/" + b.getArtist().getId() + "?payment=" + result + "&bookingId=" + b.getId() + "&key=" + b.getAccessKey());
    }

    // ---------- blue badge ----------
    @Transactional
    public PaymentInitResponse initiateBadge(User artist) {
        if (artist.getRole() != Role.ARTIST) throw ApiException.forbidden("Only makeup artists can get a verified badge.");
        if (badges.findByArtistId(artist.getId()).filter(BlueBadge::isActive).isPresent())
            throw ApiException.conflict("You already have the verified badge.");
        BigDecimal price = settings.badgePrice();
        String tranId = newTranId("BB");
        badgeTxs.save(BlueBadgeTransaction.builder().tranId(tranId).artist(artist).amount(price).currency("BDT").build());
        String url = gateway.init(tranId, price, artist.getName(), artist.getEmail(), artist.getPhone(), "GlamHub verified badge",
                api("/blue-badge/payment/success"), api("/blue-badge/payment/fail"), api("/blue-badge/payment/cancel"));
        if (url == null) throw ApiException.badRequest("Online payment isn't available right now. Please try again shortly.");
        return new PaymentInitResponse(url, tranId);
    }

    @Transactional
    public String badgeCallback(String tranId, String valId, String outcome) {
        BlueBadgeTransaction tx = tranId == null ? null : badgeTxs.findByTranId(tranId).orElse(null);
        if (tx == null) return front("/dashboard/verified-badge");
        String result = "failed";
        if (tx.getStatus() == PaymentStatus.VALID) {
            result = "success";
        } else if ("success".equals(outcome)) {
            if (confirmed(valId, tx.getTranId(), tx.getAmount())) {
                tx.setStatus(PaymentStatus.VALID);
                tx.setValidatedAt(Instant.now());
                grantBadge(tx.getArtist(), tx.getAmount());
                result = "success";
            } else {
                tx.setStatus(PaymentStatus.FAILED);
            }
        } else if ("cancel".equals(outcome)) {
            if (tx.getStatus() == PaymentStatus.PENDING) tx.setStatus(PaymentStatus.CANCELLED);
            result = "cancelled";
        } else if (tx.getStatus() == PaymentStatus.PENDING) {
            tx.setStatus(PaymentStatus.FAILED);
        }
        badgeTxs.save(tx);
        return front("/dashboard/verified-badge?payment=" + result);
    }

    private void grantBadge(User artist, BigDecimal amount) {
        BlueBadge badge = badges.findByArtistId(artist.getId()).orElseGet(() -> BlueBadge.builder().artist(artist).build());
        badge.setActive(true);
        badge.setAmountPaid(amount);
        badge.setPurchasedAt(Instant.now());
        badges.save(badge);
        profiles.findByUserId(artist.getId()).ifPresent(p -> { p.setHasBlueBadge(true); profiles.save(p); });
    }

    /** Valid per the gateway, for THIS transaction, and for the amount we asked for. */
    private boolean confirmed(String valId, String tranId, BigDecimal expected) {
        Validation v = gateway.validate(valId);
        return v.valid() && tranId.equals(v.tranId()) && v.amount() != null
                && v.amount().subtract(expected).abs().compareTo(new BigDecimal("0.01")) <= 0;
    }

    @Scheduled(fixedDelay = 900_000, initialDelay = 180_000)
    @Transactional
    public void expireStalePayments() {
        Instant before = Instant.now().minusSeconds(3600);
        bookingTxs.stalePending(before).forEach(t -> { t.setStatus(PaymentStatus.CANCELLED); bookingTxs.save(t); });
    }
}
