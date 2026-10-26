package com.glamhub.service;

import com.glamhub.model.Business.Booking;
import com.glamhub.model.Business.BookingPaymentTransaction;
import com.glamhub.model.Enums.PaymentStatus;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import com.glamhub.service.SslCommerzClient.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** The payment pattern: the browser redirect is only a hint; the gateway's own validation decides. */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock SslCommerzClient gateway;
    @Mock BookingRepository bookings;
    @Mock BookingTxRepository bookingTxs;
    @Mock BlueBadgeRepository badges;
    @Mock BlueBadgeTxRepository badgeTxs;
    @Mock ArtistProfileRepository profiles;
    @Mock UserRepository users;
    @Mock SettingsService settings;
    PaymentService service;
    Booking booking;
    BookingPaymentTransaction tx;

    @BeforeEach
    void setUp() {
        service = new PaymentService(gateway, bookings, bookingTxs, badges, badgeTxs, profiles, users, settings);
        ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
        User artist = User.builder().id(7L).name("A").email("a@x.com").build();
        booking = Booking.builder().id(3L).artist(artist).accessKey("KEY").depositAmount(new BigDecimal("1000.00")).otpVerified(true).build();
        tx = BookingPaymentTransaction.builder().tranId("BK1").booking(booking).amount(new BigDecimal("1000.00")).status(PaymentStatus.PENDING).build();
        lenient().when(bookingTxs.findByTranId("BK1")).thenReturn(Optional.of(tx));
    }

    @Test
    void forgedSuccessIsRejectedWhenTheGatewayDoesNotConfirm() {
        when(gateway.validate("FAKE")).thenReturn(new Validation(false, null, null));
        String url = service.bookingCallback("BK1", "FAKE", "success");
        assertTrue(url.contains("payment=failed"));
        assertFalse(booking.isDepositPaid());
        assertEquals(PaymentStatus.FAILED, tx.getStatus());
    }

    @Test
    void validationForADifferentTransactionIsRejected() {
        when(gateway.validate("V")).thenReturn(new Validation(true, "SOMEONE-ELSES", new BigDecimal("1000.00")));
        assertTrue(service.bookingCallback("BK1", "V", "success").contains("payment=failed"));
        assertFalse(booking.isDepositPaid());
    }

    @Test
    void wrongAmountIsRejected() {
        when(gateway.validate("V")).thenReturn(new Validation(true, "BK1", new BigDecimal("10.00")));
        assertTrue(service.bookingCallback("BK1", "V", "success").contains("payment=failed"));
        assertFalse(booking.isDepositPaid());
    }

    @Test
    void confirmedPaymentMarksTheDepositPaidAndToleratesRounding() {
        when(gateway.validate("V")).thenReturn(new Validation(true, "BK1", new BigDecimal("1000.005")));
        String url = service.bookingCallback("BK1", "V", "success");
        assertTrue(url.contains("payment=success") && url.contains("bookingId=3") && url.contains("key=KEY"));
        assertTrue(booking.isDepositPaid());
        assertEquals(PaymentStatus.VALID, tx.getStatus());
    }

    @Test
    void cancelLeavesTheDepositUnpaidWithoutAskingTheGateway() {
        assertTrue(service.bookingCallback("BK1", null, "cancel").contains("payment=cancelled"));
        assertEquals(PaymentStatus.CANCELLED, tx.getStatus());
        assertFalse(booking.isDepositPaid());
        verify(gateway, never()).validate(any());
    }

    @Test
    void unknownTransactionGoesHomeWithoutSideEffects() {
        assertEquals("http://localhost:5173/", service.bookingCallback("NOPE", "V", "success"));
        verify(bookings, never()).save(any());
    }

    @Test
    void aReplayedSuccessIsIdempotent() {
        tx.setStatus(PaymentStatus.VALID);
        assertTrue(service.bookingCallback("BK1", "ignored", "success").contains("payment=success"));
        verify(gateway, never()).validate(any());
    }
}
