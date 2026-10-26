package com.glamhub.service;

import com.glamhub.dto.Dtos.StaffRequest;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Account.BannedEmail;
import com.glamhub.model.Business.Booking;
import com.glamhub.model.Business.BlueBadge;
import com.glamhub.model.Enums.*;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository users;
    private final ArtistProfileRepository profiles;
    private final BookingRepository bookings;
    private final PortfolioRepository portfolio;
    private final ReviewRepository reviews;
    private final BlueBadgeRepository badges;
    private final BannedEmailRepository banned;
    private final AccountService accounts;
    private final PasswordEncoder encoder;
    private final MainAdminGuard guard;
    private final MailService mail;

    public Map<String, Object> userMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("role", u.getRole());
        m.put("location", u.getLocation());
        m.put("verified", u.isVerified());
        m.put("enabled", u.isEnabled());
        m.put("createdAt", u.getCreatedAt());
        m.put("mainAdmin", guard.isMain(u));
        if (u.getRole() == Role.ARTIST) profiles.findByUserId(u.getId()).ifPresent(p -> {
            m.put("hasBlueBadge", p.isHasBlueBadge());
            m.put("budgetTier", p.getBudgetTier());
        });
        return m;
    }

    public List<Map<String, Object>> users(String role) {
        Role r;
        try { r = role == null || role.isBlank() ? null : Role.valueOf(role.toUpperCase()); } catch (IllegalArgumentException e) { return List.of(); }
        List<User> list = r == null ? users.findByRoleInOrderByIdDesc(List.of(Role.ARTIST, Role.CUSTOMER)) : users.findByRoleOrderByIdDesc(r);
        if (r == Role.ADMIN || r == Role.MODERATOR) guard.require();
        return list.stream().map(this::userMap).toList();
    }

    @Transactional
    public Map<String, Object> verify(Long id) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        u.setVerified(!u.isVerified());
        return userMap(users.save(u));
    }

    /** Ban = delete + block the email from registering again. */
    @Transactional
    public void ban(Long id) {
        User u = mustBeMember(id);
        if (!banned.existsByEmailIgnoreCase(u.getEmail())) banned.save(BannedEmail.builder().email(u.getEmail()).build());
        accounts.deleteUserCascade(u);
    }

    @Transactional
    public void delete(Long id) { accounts.deleteUserCascade(mustBeMember(id)); }

    private User mustBeMember(Long id) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        if (u.getRole() == Role.ADMIN || u.getRole() == Role.MODERATOR) throw ApiException.forbidden("Staff accounts are managed by the main admin.");
        return u;
    }

    // ---------- staff (main admin only) ----------
    @Transactional
    public Map<String, Object> createStaff(StaffRequest r) {
        guard.require();
        if (r.role() != Role.ADMIN && r.role() != Role.MODERATOR) throw ApiException.badRequest("Staff must be an admin or a moderator.");
        String email = r.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("An account with this email already exists.");
        User u = users.save(User.builder().role(r.role()).name(r.name().trim()).email(email).passwordHash(encoder.encode(r.password())).verified(true).build());
        mail.send(email, "Your GlamHub " + r.role().name().toLowerCase() + " account",
                "Hi " + u.getName() + ",\n\nA GlamHub " + r.role().name().toLowerCase() + " account was created for you.\nEmail: " + email
                        + "\nPlease log in at the staff portal and ask the main admin for your password.\n\n- GlamHub");
        return userMap(u);
    }

    @Transactional
    public void deleteStaff(Long id) {
        guard.require();
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        if (u.getRole() != Role.ADMIN && u.getRole() != Role.MODERATOR) throw ApiException.badRequest("That isn't a staff account.");
        accounts.deleteUserCascade(u);
    }

    // ---------- blue badge management (main admin only) ----------
    public List<Map<String, Object>> badgeHolders() {
        guard.require();
        return badges.findAllByOrderByPurchasedAtDesc().stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("artistId", b.getArtist().getId());
            m.put("artistName", b.getArtist().getName());
            m.put("artistEmail", b.getArtist().getEmail());
            m.put("amountPaid", b.getAmountPaid());
            m.put("purchasedAt", b.getPurchasedAt());
            m.put("active", b.isActive());
            return m;
        }).toList();
    }

    @Transactional
    public void revokeBadge(Long badgeId) {
        guard.require();
        BlueBadge b = badges.findById(badgeId).orElseThrow(() -> ApiException.notFound("Badge not found."));
        b.setActive(false);
        badges.save(b);
        profiles.findByUserId(b.getArtist().getId()).ifPresent(p -> { p.setHasBlueBadge(false); profiles.save(p); });
    }

    // ---------- overview ----------
    public Map<String, Object> overview() {
        Map<String, Object> m = new LinkedHashMap<>();
        List<User> all = users.findAll();
        m.put("artists", all.stream().filter(u -> u.getRole() == Role.ARTIST).count());
        m.put("customers", all.stream().filter(u -> u.getRole() == Role.CUSTOMER).count());
        m.put("verifiedArtists", all.stream().filter(u -> u.getRole() == Role.ARTIST && u.isVerified()).count());
        List<Booking> bs = bookings.findAll();
        m.put("bookings", bs.size());
        Map<String, Long> byStatus = bs.stream().collect(Collectors.groupingBy(b -> b.getStatus().name(), TreeMap::new, Collectors.counting()));
        m.put("bookingsByStatus", byStatus);
        BigDecimal deposits = bs.stream().filter(Booking::isDepositPaid).map(Booking::getDepositAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        m.put("depositsCollected", deposits);
        BigDecimal badgeRevenue = badges.findAll().stream().map(BlueBadge::getAmountPaid).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        m.put("badgeRevenue", badgeRevenue);
        m.put("activeBadges", badges.findAll().stream().filter(BlueBadge::isActive).count());
        m.put("photosByStatus", portfolio.findAll().stream().collect(Collectors.groupingBy(i -> i.getVerificationStatus().name(), TreeMap::new, Collectors.counting())));
        m.put("reviews", reviews.count());

        List<Map<String, Object>> monthly = new ArrayList<>();
        YearMonth now = YearMonth.now(ZoneOffset.UTC);
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            long count = bs.stream().filter(b -> YearMonth.from(b.getCreatedAt().atZone(ZoneOffset.UTC)).equals(ym)).count();
            monthly.add(Map.of("month", ym.toString(), "bookings", count));
        }
        m.put("monthlyBookings", monthly);

        Map<Long, Long> completedByArtist = bs.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .collect(Collectors.groupingBy(b -> b.getArtist().getId(), Collectors.counting()));
        List<Map<String, Object>> top = completedByArtist.entrySet().stream().sorted(Map.Entry.<Long, Long>comparingByValue().reversed()).limit(5)
                .map(e -> {
                    User u = users.findById(e.getKey()).orElse(null);
                    return Map.<String, Object>of("artistId", e.getKey(), "name", u == null ? "?" : u.getName(), "completed", e.getValue());
                }).toList();
        m.put("topArtists", top);
        return m;
    }
}
