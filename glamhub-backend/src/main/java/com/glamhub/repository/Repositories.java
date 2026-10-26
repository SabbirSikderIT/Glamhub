package com.glamhub.repository;

import com.glamhub.model.*;
import com.glamhub.model.Account.*;
import com.glamhub.model.Business.*;
import com.glamhub.model.Enums.*;
import com.glamhub.model.Media.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** All Spring Data repositories (needs considerNestedRepositories = true). */
public final class Repositories {
    private Repositories() {}

    public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmailIgnoreCase(String email);
        boolean existsByEmailIgnoreCase(String email);
        List<User> findByRoleOrderByIdDesc(Role role);
        List<User> findByRoleInOrderByIdDesc(Collection<Role> roles);
    }

    public interface ArtistProfileRepository extends JpaRepository<ArtistProfile, Long> {
        Optional<ArtistProfile> findByUserId(Long userId);
        void deleteByUserId(Long userId);

        @Query("""
            select p from ArtistProfile p
            where p.user.enabled = true and p.user.role = com.glamhub.model.Enums.Role.ARTIST
              and (:q = '' or lower(p.user.name) like concat('%', :q, '%')
                   or lower(p.user.email) like concat('%', :q, '%')
                   or lower(coalesce(p.user.phone, '')) like concat('%', :q, '%'))
              and (:district = '' or p.baseLocation = :district)
              and (:useTier = false or p.budgetTier = :tier)
              and (:useCategory = false or exists (
                    select 1 from PortfolioImage i where i.artist = p.user
                      and i.verificationStatus = com.glamhub.model.Enums.VerificationStatus.VERIFIED
                      and i.category = :category))
            order by p.hasBlueBadge desc, p.id asc
            """)
        Page<ArtistProfile> search(@Param("q") String q, @Param("district") String district,
                                   @Param("useTier") boolean useTier, @Param("tier") BudgetTier tier,
                                   @Param("useCategory") boolean useCategory, @Param("category") PortfolioCategory category,
                                   Pageable pageable);
    }

    public interface BannedEmailRepository extends JpaRepository<BannedEmail, Long> {
        boolean existsByEmailIgnoreCase(String email);
    }

    public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
        Optional<PasswordResetToken> findByToken(String token);
        void deleteByUserId(Long userId);
    }

    public interface OtpRepository extends JpaRepository<OtpVerification, Long> {
        Optional<OtpVerification> findFirstByContactOrderByIdDesc(String contact);
        void deleteByContact(String contact);
    }

    public interface DeletionRequestRepository extends JpaRepository<DeletionRequest, Long> {
        Optional<DeletionRequest> findByUserId(Long userId);
        List<DeletionRequest> findAllByOrderByCreatedAtDesc();
        void deleteByUserId(Long userId);
    }

    public interface PackageRepository extends JpaRepository<ServicePackage, Long> {
        List<ServicePackage> findByArtistIdOrderByPriceAsc(Long artistId);
        void deleteByArtistId(Long artistId);
    }

    public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
        Optional<Availability> findByArtistIdAndDate(Long artistId, LocalDate date);
        List<Availability> findByArtistIdAndDateBetween(Long artistId, LocalDate from, LocalDate to);
        void deleteByArtistId(Long artistId);
    }

    public interface BookingRepository extends JpaRepository<Booking, Long> {
        List<Booking> findByArtistIdOrderByBookingDateDesc(Long artistId);
        List<Booking> findByCustomerIdOrderByBookingDateDesc(Long customerId);
        Optional<Booking> findByQrVerificationToken(String token);
        List<Booking> findByArtistId(Long artistId);
        List<Booking> findByCustomerId(Long customerId);
    }

    public interface BookingTxRepository extends JpaRepository<BookingPaymentTransaction, Long> {
        Optional<BookingPaymentTransaction> findByTranId(String tranId);
        List<BookingPaymentTransaction> findByBookingIdIn(Collection<Long> ids);
        @Modifying @Query("delete from BookingPaymentTransaction t where t.booking.id in :ids")
        void deleteByBookingIds(@Param("ids") Collection<Long> ids);
        @Query("select t from BookingPaymentTransaction t where t.status = com.glamhub.model.Enums.PaymentStatus.PENDING and t.createdAt < :before")
        List<BookingPaymentTransaction> stalePending(@Param("before") Instant before);
    }

    public interface BookingMoneyRepository extends JpaRepository<BookingMoneySettings, Long> {}

    public interface ReviewRepository extends JpaRepository<Review, Long> {
        Optional<Review> findByBookingId(Long bookingId);
        List<Review> findByArtistIdAndStatusOrderByCreatedAtDesc(Long artistId, ReviewStatus status);
        List<Review> findByArtistIdOrderByCreatedAtDesc(Long artistId);
        List<Review> findAllByOrderByCreatedAtDesc();
        void deleteByArtistId(Long artistId);
        @Modifying @Query("delete from Review r where r.booking.id in :ids")
        void deleteByBookingIds(@Param("ids") Collection<Long> ids);
    }

    public interface PortfolioRepository extends JpaRepository<PortfolioImage, Long> {
        List<PortfolioImage> findByArtistIdOrderByCreatedAtDesc(Long artistId);
        List<PortfolioImage> findByArtistIdAndVerificationStatusOrderByCreatedAtDesc(Long artistId, VerificationStatus s);
        List<PortfolioImage> findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus s);
        List<PortfolioImage> findAllByOrderByCreatedAtDesc();
        List<PortfolioImage> findByVerificationStatus(VerificationStatus s);
        Optional<PortfolioImage> findFirstByContentHashAndVerificationStatus(String hash, VerificationStatus s);
        List<PortfolioImage> findByVerificationStatusAndPerceptualHashIsNotNull(VerificationStatus s);
        long countByArtistIdAndVerificationStatus(Long artistId, VerificationStatus s);
        @Query("select i from PortfolioImage i where i.verificationStatus = com.glamhub.model.Enums.VerificationStatus.VERIFIED and i.artist.enabled = true order by i.createdAt desc")
        List<PortfolioImage> recentVerified(Pageable pageable);
    }

    public interface BlueBadgeRepository extends JpaRepository<BlueBadge, Long> {
        Optional<BlueBadge> findByArtistId(Long artistId);
        List<BlueBadge> findAllByOrderByPurchasedAtDesc();
        void deleteByArtistId(Long artistId);
    }

    public interface BlueBadgeSettingsRepository extends JpaRepository<BlueBadgeSettings, Long> {}

    public interface BlueBadgeTxRepository extends JpaRepository<BlueBadgeTransaction, Long> {
        Optional<BlueBadgeTransaction> findByTranId(String tranId);
        void deleteByArtistId(Long artistId);
    }

    public interface PaletteRepository extends JpaRepository<ColorPalette, Long> {
        List<ColorPalette> findAllByOrderByIdAsc();
    }

    public interface LookRepository extends JpaRepository<MakeupLook, Long> {
        List<MakeupLook> findAllByOrderByIdAsc();
    }

    public interface ConversationRepository extends JpaRepository<AiChatConversation, Long> {
        List<AiChatConversation> findByUserIdOrderByCreatedAtDesc(Long userId);
        void deleteByUserId(Long userId);
    }

    public interface ChatMessageRepository extends JpaRepository<AiChatMessage, Long> {
        List<AiChatMessage> findByConversationIdOrderByIdAsc(Long conversationId);
        void deleteByConversationId(Long conversationId);
    }
}
