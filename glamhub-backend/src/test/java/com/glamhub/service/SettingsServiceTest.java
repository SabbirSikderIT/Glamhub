package com.glamhub.service;

import com.glamhub.exception.ApiException;
import com.glamhub.model.Business.BookingMoneySettings;
import com.glamhub.repository.Repositories.BlueBadgeSettingsRepository;
import com.glamhub.repository.Repositories.BookingMoneyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettingsServiceTest {
    @Mock BookingMoneyRepository money;
    @Mock BlueBadgeSettingsRepository badge;
    @Mock MainAdminGuard guard;
    SettingsService service;

    @BeforeEach
    void setUp() { service = new SettingsService(money, badge, guard); }

    @Test
    void defaultsToTenPercentAndFiveHundredWhenNoRowExists() {
        when(money.findById(1L)).thenReturn(Optional.empty());
        when(badge.findById(1L)).thenReturn(Optional.empty());
        assertEquals(new BigDecimal("10.00"), service.depositPercent());
        assertEquals(new BigDecimal("500.00"), service.badgePrice());
    }

    @Test
    void readingNeverWrites() {
        when(money.findById(1L)).thenReturn(Optional.empty());
        service.depositPercent();
        verify(money, never()).save(any());
    }

    @Test
    void usesTheStoredPercent() {
        when(money.findById(1L)).thenReturn(Optional.of(BookingMoneySettings.builder().id(1L).depositPercent(new BigDecimal("12.50")).build()));
        assertEquals(new BigDecimal("12.50"), service.depositPercent());
    }

    @Test
    void onlyTheMainAdminMayChangeIt() {
        when(guard.require()).thenThrow(ApiException.forbidden("Only the main admin can do this."));
        assertThrows(ApiException.class, () -> service.updateDepositPercent(new BigDecimal("20")));
        verify(money, never()).save(any());
    }

    @Test
    void rejectsOutOfRangeAndTooPreciseValues() {
        for (String bad : new String[]{"0", "0.99", "100.01", "-5", "12.345"}) {
            assertThrows(ApiException.class, () -> service.updateDepositPercent(new BigDecimal(bad)), bad);
        }
        verify(money, never()).save(any());
    }

    @Test
    void acceptsBoundaryValuesAndUpserts() {
        when(money.findById(1L)).thenReturn(Optional.empty());
        when(money.save(any())).thenAnswer(i -> i.getArgument(0));
        assertEquals(new BigDecimal("1.00"), service.updateDepositPercent(new BigDecimal("1")));
        assertEquals(new BigDecimal("100.00"), service.updateDepositPercent(new BigDecimal("100")));
    }
}
