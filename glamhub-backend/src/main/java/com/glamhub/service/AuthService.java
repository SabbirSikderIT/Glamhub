package com.glamhub.service;

import com.glamhub.config.JwtService;
import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Account.OtpVerification;
import com.glamhub.model.Account.PasswordResetToken;
import com.glamhub.model.ArtistProfile;
import com.glamhub.model.Enums.BudgetTier;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import com.glamhub.util.Districts;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository users;
    private final ArtistProfileRepository profiles;
    private final BannedEmailRepository banned;
    private final PasswordResetTokenRepository resetTokens;
    private final OtpRepository otps;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final MailService mail;
    private final MainAdminGuard mainAdmin;

    @Transactional
    public AuthResponse registerArtist(RegisterArtistRequest r) {
        if (!Districts.isValid(r.district())) throw ApiException.badRequest("Please choose a district from the list.");
        User u = createUser(Role.ARTIST, r.name(), r.email(), r.password(), r.phone(), r.district());
        profiles.save(ArtistProfile.builder().user(u).baseLocation(r.district())
                .budgetTier(r.budgetTier() == null ? BudgetTier.MEDIUM : r.budgetTier()).build());
        return toResponse(u);
    }

    @Transactional
    public AuthResponse registerCustomer(RegisterCustomerRequest r) {
        return toResponse(createUser(Role.CUSTOMER, r.name(), r.email(), r.password(), r.phone(), null));
    }

    private User createUser(Role role, String name, String email, String password, String phone, String location) {
        String e = email.trim().toLowerCase();
        if (banned.existsByEmailIgnoreCase(e)) throw ApiException.forbidden("This email can't be used to register.");
        if (users.existsByEmailIgnoreCase(e)) throw ApiException.conflict("An account with this email already exists.");
        return users.save(User.builder().role(role).name(name.trim()).email(e).passwordHash(encoder.encode(password))
                .phone(phone == null || phone.isBlank() ? null : phone.trim()).location(location).build());
    }

    public AuthResponse login(LoginRequest r, boolean adminOnly) {
        User u = users.findByEmailIgnoreCase(r.email().trim()).orElseThrow(() -> new BadCredentialsException("bad"));
        if (!encoder.matches(r.password(), u.getPasswordHash())) throw new BadCredentialsException("bad");
        if (!u.isEnabled()) throw new DisabledException("disabled");
        boolean staff = u.getRole() == Role.ADMIN || u.getRole() == Role.MODERATOR;
        if (adminOnly && !staff) throw ApiException.forbidden("This login is for GlamHub staff only.");
        return toResponse(u);
    }

    public AuthResponse toResponse(User u) {
        return new AuthResponse(jwt.generate(u), u.getId(), u.getName(), u.getEmail(), u.getRole(), u.getProfilePhotoUrl(), mainAdmin.isMain(u));
    }

    // ---------- password reset ----------
    @Transactional
    public void forgotPassword(String email) {
        users.findByEmailIgnoreCase(email.trim()).ifPresent(u -> {
            String contact = "reset:" + u.getEmail();
            otps.deleteByContact(contact);
            String code = String.format("%06d", RNG.nextInt(1_000_000));
            otps.save(OtpVerification.builder().contact(contact).code(code).expiresAt(Instant.now().plusSeconds(600)).build());
            boolean sent = mail.send(u.getEmail(), "Your GlamHub password reset code",
                    "Hi " + u.getName() + ",\n\nYour GlamHub verification code is " + code + ". It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.\n\n- GlamHub");
            if (!sent) log.warn("Password reset OTP for {} (email not sent): {}", u.getEmail(), code);
        });
    }

    @Transactional
    public String verifyResetOtp(VerifyResetOtpRequest r) {
        String contact = "reset:" + r.email().trim().toLowerCase();
        OtpVerification o = otps.findFirstByContactOrderByIdDesc(contact)
                .orElseThrow(() -> ApiException.badRequest("That code isn't right or has expired."));
        if (o.getExpiresAt().isBefore(Instant.now()) || !o.getCode().equals(r.otp().trim()))
            throw ApiException.badRequest("That code isn't right or has expired.");
        User u = users.findByEmailIgnoreCase(r.email().trim()).orElseThrow(() -> ApiException.badRequest("That code isn't right or has expired."));
        otps.deleteByContact(contact);
        resetTokens.deleteByUserId(u.getId());
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        resetTokens.save(PasswordResetToken.builder().token(token).user(u).expiresAt(Instant.now().plusSeconds(1800)).build());
        return token;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest r) {
        PasswordResetToken t = resetTokens.findByToken(r.token())
                .orElseThrow(() -> ApiException.badRequest("This reset link has expired. Please start again."));
        if (t.isUsed() || t.getExpiresAt().isBefore(Instant.now()))
            throw ApiException.badRequest("This reset link has expired. Please start again.");
        User u = t.getUser();
        u.setPasswordHash(encoder.encode(r.newPassword()));
        users.save(u);
        t.setUsed(true);
        resetTokens.save(t);
    }
}
