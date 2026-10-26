package com.glamhub.service;

import com.glamhub.dto.Dtos.BookingCreateRequest;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Business.Availability;
import com.glamhub.model.Business.Booking;
import com.glamhub.model.Business.ServicePackage;
import com.glamhub.model.Enums.AvailabilityStatus;
import com.glamhub.model.Enums.BookingStatus;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {
    @Mock BookingRepository bookings;
    @Mock UserRepository users;
    @Mock PackageRepository packages;
    @Mock AvailabilityRepository availability;
    @Mock OtpRepository otps;
    @Mock ReviewRepository reviews;
    @Mock BookingTxRepository txs;
    @Mock SettingsService settings;
    @Mock MainAdminGuard mainAdmin;
    @Mock MailService mail;
    BookingService service;
    User artist;
    ServicePackage pkg;

    @BeforeEach
    void setUp() {
        service = new BookingService(bookings, users, packages, availability, otps, reviews, txs, settings, mainAdmin, mail);
        artist = User.builder().id(2L).role(Role.ARTIST).enabled(true).name("A").email("a@x.com").build();
        pkg = ServicePackage.builder().id(9L).artist(artist).title("Bridal").price(new BigDecimal("3333.33")).build();
        lenient().when(users.findById(2L)).thenReturn(Optional.of(artist));
        lenient().when(packages.findById(9L)).thenReturn(Optional.of(pkg));
        lenient().when(bookings.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(reviews.findByBookingId(any())).thenReturn(Optional.empty());
    }

    private BookingCreateRequest req(LocalDate d) { return new BookingCreateRequest(2L, 9L, d, null, "G", "017", "g@x.com"); }

    @Test
    void depositIsSnapshottedWithOneHalfUpRoundingStep() {
        when(settings.depositPercent()).thenReturn(new BigDecimal("12.50"));
        when(availability.findByArtistIdAndDate(2L, LocalDate.now().plusDays(3))).thenReturn(Optional.empty());
        var created = service.create(req(LocalDate.now().plusDays(3)));
        assertEquals(new BigDecimal("416.67"), created.booking().depositAmount()); // 3333.33 * 12.5% = 416.66625
        assertEquals(new BigDecimal("12.50"), created.booking().depositPercent());
        assertNotNull(created.accessKey());
    }

    @Test
    void rejectsPastDatesAndTakenDates() {
        assertThrows(ApiException.class, () -> service.create(req(LocalDate.now().minusDays(1))));
        LocalDate d = LocalDate.now().plusDays(2);
        when(availability.findByArtistIdAndDate(2L, d)).thenReturn(Optional.of(Availability.builder().artist(artist).date(d).status(AvailabilityStatus.BLOCKED).build()));
        assertThrows(ApiException.class, () -> service.create(req(d)));
    }

    @Test
    void rejectsAPackageFromAnotherArtist() {
        User other = User.builder().id(3L).build();
        when(packages.findById(9L)).thenReturn(Optional.of(ServicePackage.builder().artist(other).price(BigDecimal.TEN).build()));
        assertThrows(ApiException.class, () -> service.create(req(LocalDate.now().plusDays(2))));
    }

    @Test
    void guestsNeedTheSecretKeyToReadABooking() {
        Booking b = Booking.builder().id(1L).artist(artist).servicePackage(pkg).accessKey("SECRET").build();
        when(bookings.findById(1L)).thenReturn(Optional.of(b));
        assertThrows(ApiException.class, () -> service.authorized(1L, null));
        assertThrows(ApiException.class, () -> service.authorized(1L, "guess"));
        assertSame(b, service.authorized(1L, "SECRET"));
    }

    private Booking booking(BookingStatus s, boolean verified, boolean paid, LocalDate date) {
        Booking b = Booking.builder().id(1L).artist(artist).servicePackage(pkg).status(s).otpVerified(verified).depositPaid(paid).bookingDate(date).build();
        when(bookings.findById(1L)).thenReturn(Optional.of(b));
        return b;
    }

    @Test
    void confirmNeedsVerificationAndDeposit() {
        booking(BookingStatus.PENDING, true, false, LocalDate.now().plusDays(2));
        assertThrows(ApiException.class, () -> service.updateStatus(artist, 1L, BookingStatus.CONFIRMED));
    }

    @Test
    void terminalStatesStayTerminalAndCompletionWaitsForTheSessionDate() {
        booking(BookingStatus.COMPLETED, true, true, LocalDate.now());
        assertThrows(ApiException.class, () -> service.updateStatus(artist, 1L, BookingStatus.CANCELLED));
        booking(BookingStatus.CONFIRMED, true, true, LocalDate.now().plusDays(5));
        assertThrows(ApiException.class, () -> service.updateStatus(artist, 1L, BookingStatus.COMPLETED));
    }

    @Test
    void cancellingFreesTheDate() {
        LocalDate d = LocalDate.now().plusDays(4);
        booking(BookingStatus.PENDING, false, false, d);
        Availability a = Availability.builder().artist(artist).date(d).status(AvailabilityStatus.BOOKED).build();
        when(availability.findByArtistIdAndDate(2L, d)).thenReturn(Optional.of(a));
        service.updateStatus(artist, 1L, BookingStatus.CANCELLED);
        assertEquals(AvailabilityStatus.FREE, a.getStatus());
    }

    @Test
    void onlyTheOwningArtistCanChangeTheStatus() {
        booking(BookingStatus.PENDING, true, true, LocalDate.now().plusDays(2));
        User stranger = User.builder().id(99L).build();
        assertThrows(ApiException.class, () -> service.updateStatus(stranger, 1L, BookingStatus.CANCELLED));
    }
}
