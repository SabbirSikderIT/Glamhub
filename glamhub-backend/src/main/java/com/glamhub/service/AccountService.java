package com.glamhub.service;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Account.DeletionRequest;
import com.glamhub.model.Business.*;
import com.glamhub.model.Enums.*;
import com.glamhub.model.Media.PortfolioImage;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** The signed-in user's own account, plus the cascade delete used by both bans and approved deletion requests. */
@Service
@RequiredArgsConstructor
public class AccountService {
    private final UserRepository users;
    private final ArtistProfileRepository profiles;
    private final DeletionRequestRepository deletionRequests;
    private final PackageRepository packages;
    private final AvailabilityRepository availability;
    private final BookingRepository bookings;
    private final BookingTxRepository bookingTxs;
    private final ReviewRepository reviews;
    private final PortfolioRepository portfolio;
    private final BlueBadgeRepository badges;
    private final BlueBadgeTxRepository badgeTxs;
    private final PasswordResetTokenRepository resetTokens;
    private final ConversationRepository conversations;
    private final ChatMessageRepository chatMessages;
    private final FileStorageService files;
    private final PasswordEncoder encoder;
    private final MainAdminGuard mainAdmin;

    public AccountDto toDto(User u) {
        return new AccountDto(u.getId(), u.getRole(), u.getName(), u.getEmail(), u.getPhone(), u.getLocation(), u.getBio(), u.getProfilePhotoUrl());
    }

    public AccountDto me(User u) { return toDto(users.findById(u.getId()).orElseThrow()); }

    @Transactional
    public AccountDto update(User me, AccountUpdateRequest r) {
        User u = users.findById(me.getId()).orElseThrow();
        u.setName(r.name().trim());
        u.setPhone(r.phone() == null || r.phone().isBlank() ? null : r.phone().trim());
        u.setBio(r.bio() == null || r.bio().isBlank() ? null : r.bio().trim());
        if (u.getRole() != Role.ARTIST) u.setLocation(r.location() == null || r.location().isBlank() ? null : r.location().trim());
        return toDto(users.save(u));
    }

    @Transactional
    public AccountDto setPhoto(User me, MultipartFile file) {
        User u = users.findById(me.getId()).orElseThrow();
        String old = u.getProfilePhotoUrl();
        u.setProfilePhotoUrl(files.save(files.readImage(file)));
        users.save(u);
        files.deleteByUrl(old);
        return toDto(u);
    }

    // ---------- deletion requests ----------
    public Map<String, Object> myDeletionRequest(User me) {
        return deletionRequests.findByUserId(me.getId()).map(this::requestMap).orElse(Map.of("status", "NONE"));
    }

    @Transactional
    public Map<String, Object> requestDeletion(User me, String reason) {
        if (me.getRole() == Role.ADMIN || me.getRole() == Role.MODERATOR) throw ApiException.forbidden("Staff accounts are managed by the main admin.");
        DeletionRequest r = deletionRequests.findByUserId(me.getId()).orElseGet(() -> DeletionRequest.builder().user(me).build());
        if (r.getId() != null && r.getStatus() == DeletionStatus.PENDING) throw ApiException.conflict("Your request is already waiting for review.");
        r.setReason(reason == null || reason.isBlank() ? null : reason.trim());
        r.setStatus(DeletionStatus.PENDING);
        r.setAdminNote(null);
        r.setResolvedAt(null);
        r.setCreatedAt(Instant.now());
        return requestMap(deletionRequests.save(r));
    }

    @Transactional
    public void cancelDeletion(User me) {
        deletionRequests.findByUserId(me.getId()).ifPresent(deletionRequests::delete);
    }

    public List<Map<String, Object>> adminQueue() {
        return deletionRequests.findAllByOrderByCreatedAtDesc().stream().map(r -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>(requestMap(r));
            m.put("userName", r.getUser().getName());
            m.put("userEmail", r.getUser().getEmail());
            m.put("userRole", r.getUser().getRole());
            return m;
        }).toList();
    }

    /** Approving removes the request row first, in the same transaction as the cascade delete. */
    @Transactional
    public void approveDeletion(Long requestId) {
        DeletionRequest r = deletionRequests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found."));
        User u = r.getUser();
        deletionRequests.delete(r);
        deletionRequests.flush();
        deleteUserCascade(u);
    }

    @Transactional
    public void rejectDeletion(Long requestId, String note) {
        DeletionRequest r = deletionRequests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request not found."));
        r.setStatus(DeletionStatus.REJECTED);
        r.setAdminNote(note == null || note.isBlank() ? null : note.trim());
        r.setResolvedAt(Instant.now());
        deletionRequests.save(r);
    }

    private Map<String, Object> requestMap(DeletionRequest r) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("status", r.getStatus());
        m.put("reason", r.getReason());
        m.put("adminNote", r.getAdminNote());
        m.put("createdAt", r.getCreatedAt());
        m.put("resolvedAt", r.getResolvedAt());
        return m;
    }

    // ---------- cascade delete ----------
    public void requirePassword(User admin, String password) {
        User a = users.findById(admin.getId()).orElseThrow();
        if (!encoder.matches(password, a.getPasswordHash())) throw ApiException.forbidden("That password isn't correct.");
    }

    /** Removes a user and everything that hangs off them. Bookings made as a customer are anonymised, not deleted. */
    @Transactional
    public void deleteUserCascade(User u) {
        if (mainAdmin.isMain(u)) throw ApiException.forbidden("The main admin account can't be removed.");
        Long id = u.getId();
        resetTokens.deleteByUserId(id);
        deletionRequests.deleteByUserId(id);
        conversations.findByUserIdOrderByCreatedAtDesc(id).forEach(c -> chatMessages.deleteByConversationId(c.getId()));
        conversations.deleteByUserId(id);

        for (Booking b : bookings.findByCustomerId(id)) { b.setCustomer(null); bookings.save(b); }

        if (u.getRole() == Role.ARTIST) {
            List<Long> bookingIds = bookings.findByArtistId(id).stream().map(Booking::getId).toList();
            if (!bookingIds.isEmpty()) {
                reviews.deleteByBookingIds(bookingIds);
                bookingTxs.deleteByBookingIds(bookingIds);
            }
            reviews.deleteByArtistId(id);
            bookings.deleteAll(bookings.findByArtistId(id));
            bookings.flush();
            availability.deleteByArtistId(id);
            badgeTxs.deleteByArtistId(id);
            badges.deleteByArtistId(id);
            for (PortfolioImage i : portfolio.findByArtistIdOrderByCreatedAtDesc(id)) files.deleteByUrl(i.getImageUrl());
            portfolio.deleteAll(portfolio.findByArtistIdOrderByCreatedAtDesc(id));
            packages.deleteByArtistId(id);
            profiles.deleteByUserId(id);
        }
        files.deleteByUrl(u.getProfilePhotoUrl());
        users.delete(u);
    }
}
