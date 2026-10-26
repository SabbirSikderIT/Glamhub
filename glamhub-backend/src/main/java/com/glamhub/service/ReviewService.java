package com.glamhub.service;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.ArtistProfile;
import com.glamhub.model.Business.Booking;
import com.glamhub.model.Business.Review;
import com.glamhub.model.Enums.BookingStatus;
import com.glamhub.model.Enums.ReviewStatus;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviews;
    private final ArtistProfileRepository profiles;
    private final BookingService bookingService;

    public ReviewDto toDto(Review r) {
        return new ReviewDto(r.getId(), r.getBooking().getId(), r.getArtist().getId(), r.getArtist().getName(), r.getClientName(),
                r.getRating(), r.getComment(), r.getStatus(), r.getArtistReply(), r.getRepliedAt(), r.getCreatedAt());
    }

    /** A client reviews a completed booking once. Published immediately; only an admin can remove it. */
    @Transactional
    public ReviewDto create(ReviewCreateRequest r, String key) {
        Booking b = bookingService.authorized(r.bookingId(), key);
        if (b.getStatus() != BookingStatus.COMPLETED) throw ApiException.conflict("You can rate a session once it's been completed.");
        if (reviews.findByBookingId(b.getId()).isPresent()) throw ApiException.conflict("You've already rated this session. Thank you!");
        Review saved = reviews.save(Review.builder().booking(b).artist(b.getArtist()).clientName(b.getClientName())
                .rating(r.rating()).comment(r.comment() == null || r.comment().isBlank() ? null : r.comment().trim()).build());
        recompute(b.getArtist().getId());
        return toDto(saved);
    }

    public List<ReviewDto> publicFor(Long artistId) {
        return reviews.findByArtistIdAndStatusOrderByCreatedAtDesc(artistId, ReviewStatus.APPROVED).stream().map(this::toDto).toList();
    }

    public List<ReviewDto> mine(User artist) {
        return reviews.findByArtistIdAndStatusOrderByCreatedAtDesc(artist.getId(), ReviewStatus.APPROVED).stream().map(this::toDto).toList();
    }

    @Transactional
    public ReviewDto reply(User artist, Long id, String reply) {
        Review r = reviews.findById(id).orElseThrow(() -> ApiException.notFound("Review not found."));
        if (!r.getArtist().getId().equals(artist.getId())) throw ApiException.forbidden("That isn't your review.");
        r.setArtistReply(reply.trim());
        r.setRepliedAt(Instant.now());
        return toDto(reviews.save(r));
    }

    // ---------- admin ----------
    public List<ReviewDto> adminList() { return reviews.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList(); }

    @Transactional
    public ReviewDto adminRemove(Long id) {
        Review r = reviews.findById(id).orElseThrow(() -> ApiException.notFound("Review not found."));
        r.setStatus(ReviewStatus.REJECTED);
        reviews.save(r);
        recompute(r.getArtist().getId());
        return toDto(r);
    }

    private void recompute(Long artistId) {
        List<Review> approved = reviews.findByArtistIdAndStatusOrderByCreatedAtDesc(artistId, ReviewStatus.APPROVED);
        ArtistProfile p = profiles.findByUserId(artistId).orElse(null);
        if (p == null) return;
        p.setTotalReviews(approved.size());
        p.setRatingAvg(approved.isEmpty() ? 0 : Math.round(approved.stream().mapToInt(Review::getRating).average().orElse(0) * 10) / 10.0);
        profiles.save(p);
    }
}
