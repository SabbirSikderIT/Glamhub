package com.glamhub.service;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.ArtistProfile;
import com.glamhub.model.Business.ServicePackage;
import com.glamhub.model.Enums.*;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import com.glamhub.util.Districts;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ArtistService {
    private final ArtistProfileRepository profiles;
    private final UserRepository users;
    private final PackageRepository packages;

    public PageResponse<ArtistSummary> search(String q, String district, String budget, String category, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.max(1, Math.min(size, 50));
        boolean useTier = budget != null && !budget.isBlank();
        boolean useCat = category != null && !category.isBlank();
        BudgetTier tier = BudgetTier.LOW;
        PortfolioCategory cat = PortfolioCategory.CASUAL;
        try {
            if (useTier) tier = BudgetTier.valueOf(budget.trim().toUpperCase(Locale.ROOT));
            if (useCat) cat = PortfolioCategory.valueOf(category.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return new PageResponse<>(List.of(), p, s, 0, false); // unknown filter values match nothing
        }
        Page<ArtistProfile> res = profiles.search(q == null ? "" : q.trim().toLowerCase(Locale.ROOT),
                district == null ? "" : district.trim(), useTier, tier, useCat, cat, PageRequest.of(p, s));
        List<ArtistSummary> items = res.getContent().stream().map(this::summary).toList();
        return new PageResponse<>(items, p, s, res.getTotalElements(), res.hasNext());
    }

    public ArtistSummary summary(ArtistProfile p) {
        User u = p.getUser();
        Long min = packages.findByArtistIdOrderByPriceAsc(u.getId()).stream().findFirst()
                .map(x -> x.getPrice().longValue()).orElse(null);
        return new ArtistSummary(u.getId(), u.getName(), u.getProfilePhotoUrl(), p.getBaseLocation(), u.getBio(), p.getBudgetTier(),
                p.getYearsExperience(), p.getRatingAvg(), p.getTotalReviews(), p.isHasBlueBadge(), u.isVerified(), min);
    }

    public ArtistDetail detail(Long userId) {
        ArtistProfile p = profiles.findByUserId(userId).orElseThrow(() -> ApiException.notFound("We couldn't find that makeup artist."));
        User u = p.getUser();
        if (!u.isEnabled() || u.getRole() != Role.ARTIST) throw ApiException.notFound("We couldn't find that makeup artist.");
        return toDetail(p);
    }

    /** Contact details are only exposed on the artist's own profile. */
    public ArtistDetail mine(User me) {
        ArtistProfile p = profiles.findByUserId(me.getId()).orElseThrow(() -> ApiException.notFound("No artist profile on this account."));
        return toDetail(p);
    }

    private ArtistDetail toDetail(ArtistProfile p) {
        User u = p.getUser();
        return new ArtistDetail(u.getId(), u.getName(), null, null, u.getProfilePhotoUrl(), p.getBaseLocation(), u.getBio(),
                p.getBudgetTier(), p.getYearsExperience(), p.getRatingAvg(), p.getTotalReviews(), p.isHasBlueBadge(), u.isVerified());
    }

    public ArtistDetail mineWithContact(User me) {
        ArtistProfile p = profiles.findByUserId(me.getId()).orElseThrow(() -> ApiException.notFound("No artist profile on this account."));
        User u = p.getUser();
        return new ArtistDetail(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getProfilePhotoUrl(), p.getBaseLocation(), u.getBio(),
                p.getBudgetTier(), p.getYearsExperience(), p.getRatingAvg(), p.getTotalReviews(), p.isHasBlueBadge(), u.isVerified());
    }

    @Transactional
    public ArtistDetail update(User me, ArtistUpdateRequest r) {
        ArtistProfile p = profiles.findByUserId(me.getId()).orElseThrow(() -> ApiException.notFound("No artist profile on this account."));
        User u = users.findById(me.getId()).orElseThrow();
        if (r.baseLocation() != null && !r.baseLocation().isBlank()) {
            if (!Districts.isValid(r.baseLocation())) throw ApiException.badRequest("Please choose a district from the list.");
            p.setBaseLocation(r.baseLocation());
            u.setLocation(r.baseLocation());
        }
        u.setName(r.name().trim());
        u.setBio(r.bio() == null || r.bio().isBlank() ? null : r.bio().trim());
        u.setPhone(r.phone() == null || r.phone().isBlank() ? null : r.phone().trim());
        if (r.yearsExperience() != null) p.setYearsExperience(r.yearsExperience());
        if (r.budgetTier() != null) p.setBudgetTier(r.budgetTier());
        users.save(u);
        profiles.save(p);
        return mineWithContact(u);
    }
}
