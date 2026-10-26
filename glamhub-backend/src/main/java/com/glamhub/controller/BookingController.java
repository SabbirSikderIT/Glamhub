package com.glamhub.controller;

import com.glamhub.dto.Dtos.*;
import com.glamhub.service.BookingService;
import com.glamhub.service.PaymentService;
import com.glamhub.service.SettingsService;
import com.glamhub.util.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BookingController {
    private final BookingService bookings;
    private final PaymentService payments;
    private final SettingsService settings;

    @GetMapping("/booking-money/public")
    public Map<String, Object> publicPercent() { return Map.of("percent", settings.depositPercent()); }

    @PostMapping("/bookings")
    public ResponseEntity<BookingCreated> create(@Valid @RequestBody BookingCreateRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookings.create(r));
    }

    @GetMapping("/bookings/{id}")
    public BookingDto get(@PathVariable Long id, @RequestParam(required = false) String key) {
        return bookings.toDto(bookings.authorized(id, key));
    }

    @GetMapping("/bookings/mine")
    public List<BookingDto> mine() { return bookings.forCustomer(CurrentUser.require()); }

    @GetMapping("/bookings/artist")
    public List<BookingDto> artistBookings() { return bookings.forArtist(ArtistController.requireArtist()); }

    @PostMapping("/bookings/{id}/verification-method")
    public VerificationStartResponse method(@PathVariable Long id, @RequestParam(required = false) String key,
                                            @Valid @RequestBody VerificationMethodRequest r) {
        return bookings.startVerification(id, key, r.method());
    }

    @PostMapping("/bookings/{id}/confirm-otp")
    public BookingDto confirm(@PathVariable Long id, @RequestParam(required = false) String key, @Valid @RequestBody ConfirmOtpRequest r) {
        return bookings.confirmCode(id, key, r.code());
    }

    @PostMapping("/bookings/verify-qr/{token}")
    public BookingDto verifyQr(@PathVariable String token) { return bookings.verifyQr(token); }

    @GetMapping("/bookings/{id}/qr-code")
    public Map<String, String> qr(@PathVariable Long id) { return bookings.qrForArtist(ArtistController.requireArtist(), id); }

    @PutMapping("/bookings/{id}/status")
    public BookingDto status(@PathVariable Long id, @Valid @RequestBody StatusRequest r) {
        return bookings.updateStatus(ArtistController.requireArtist(), id, r.status());
    }

    @PostMapping("/bookings/{id}/deposit/initiate")
    public PaymentInitResponse deposit(@PathVariable Long id, @RequestParam(required = false) String key) {
        return payments.initiateDeposit(bookings.authorized(id, key));
    }

    // ---------- gateway callbacks: public, treated only as hints; the server re-validates with the gateway ----------
    @RequestMapping(value = "/bookings/payment/{outcome}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> callback(@PathVariable String outcome, @RequestParam Map<String, String> p) {
        String target = payments.bookingCallback(p.get("tran_id"), p.get("val_id"), outcome);
        return ResponseEntity.status(HttpStatus.SEE_OTHER).header(HttpHeaders.LOCATION, URI.create(target).toString()).build();
    }
}
