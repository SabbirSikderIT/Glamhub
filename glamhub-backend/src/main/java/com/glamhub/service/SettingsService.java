package com.glamhub.service;

import com.glamhub.exception.ApiException;
import com.glamhub.model.Business.BlueBadgeSettings;
import com.glamhub.model.Business.BookingMoneySettings;
import com.glamhub.repository.Repositories.BlueBadgeSettingsRepository;
import com.glamhub.repository.Repositories.BookingMoneyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/** Singleton settings rows (id = 1). Reads never write: no row means "use the default". */
@Service
@RequiredArgsConstructor
public class SettingsService {
    public static final BigDecimal DEFAULT_DEPOSIT_PERCENT = new BigDecimal("10.00");
    public static final BigDecimal DEFAULT_BADGE_PRICE = new BigDecimal("500.00");

    private final BookingMoneyRepository money;
    private final BlueBadgeSettingsRepository badge;
    private final MainAdminGuard guard;

    public BigDecimal depositPercent() {
        return money.findById(1L).map(BookingMoneySettings::getDepositPercent).orElse(DEFAULT_DEPOSIT_PERCENT);
    }

    @Transactional
    public BigDecimal updateDepositPercent(BigDecimal percent) {
        guard.require();
        if (percent.compareTo(BigDecimal.ONE) < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0)
            throw ApiException.badRequest("Booking money must be between 1% and 100%.");
        if (percent.stripTrailingZeros().scale() > 2) throw ApiException.badRequest("Use at most 2 decimal places.");
        BookingMoneySettings s = money.findById(1L).orElseGet(() -> BookingMoneySettings.builder().id(1L).build());
        s.setDepositPercent(percent.setScale(2));
        s.setUpdatedAt(Instant.now());
        return money.save(s).getDepositPercent();
    }

    public BigDecimal badgePrice() {
        return badge.findById(1L).map(BlueBadgeSettings::getPrice).orElse(DEFAULT_BADGE_PRICE);
    }

    @Transactional
    public BigDecimal updateBadgePrice(BigDecimal price) {
        guard.require();
        if (price.compareTo(BigDecimal.ONE) < 0) throw ApiException.badRequest("Price must be at least 1.");
        if (price.stripTrailingZeros().scale() > 2) throw ApiException.badRequest("Use at most 2 decimal places.");
        BlueBadgeSettings s = badge.findById(1L).orElseGet(() -> BlueBadgeSettings.builder().id(1L).build());
        s.setPrice(price.setScale(2));
        s.setUpdatedAt(Instant.now());
        return badge.save(s).getPrice();
    }
}
