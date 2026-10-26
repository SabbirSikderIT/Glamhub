package com.glamhub.service;

import com.glamhub.dto.Dtos.AdminPhotoDto;
import com.glamhub.dto.Dtos.PortfolioDto;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Enums.PortfolioCategory;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.Enums.VerificationStatus;
import com.glamhub.model.Media.PortfolioImage;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.PortfolioRepository;
import com.glamhub.service.ImageScreeningService.DeepCheck;
import com.glamhub.service.ImageScreeningService.DetectraResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PortfolioService {
    private final PortfolioRepository images;
    private final FileStorageService files;
    private final ImageScreeningService screening;

    @Value("${app.detectra.reject-threshold}")
    private double rejectThreshold;
    @Value("${app.duplicate.max-distance}")
    private int maxDistance;

    public PortfolioDto toDto(PortfolioImage i) {
        return new PortfolioDto(i.getId(), i.getImageUrl(), i.getCategory(), i.getCaption(), i.getVerificationStatus(),
                i.getRejectionReason(), i.getCreatedAt(), i.getArtist().getId(), i.getArtist().getName());
    }

    public AdminPhotoDto toAdminDto(PortfolioImage i) {
        return new AdminPhotoDto(i.getId(), i.getImageUrl(), i.getCategory(), i.getCaption(), i.getVerificationStatus(),
                i.getFlagReason(), i.getRejectionReason(), i.getDetectraVerdict(), i.getDetectraConfidence(),
                i.getAiCheckVerdict(), i.getAiCheckConfidence(), i.getArtist().getId(), i.getArtist().getName(), i.getCreatedAt());
    }

    // ---------- artist side ----------
    /** The automatic screening pipeline: EXIF -> store -> Detectra -> duplicate check -> publish. */
    @Transactional
    public PortfolioDto upload(User artist, MultipartFile file, PortfolioCategory category, String caption) {
        if (artist.getRole() != Role.ARTIST) throw ApiException.forbidden("Only makeup artists can upload portfolio photos.");
        byte[] data = files.readImage(file);
        String exif = screening.readExif(data);
        String sha = screening.sha256(data);
        Long phash = screening.perceptualHash(data);
        String url = files.save(data);

        PortfolioImage img = PortfolioImage.builder().artist(artist).imageUrl(url)
                .category(category == null ? PortfolioCategory.CASUAL : category)
                .caption(caption == null || caption.isBlank() ? null : caption.trim())
                .exifData(exif).contentHash(sha).perceptualHash(phash).build();

        DetectraResult det = screening.detect(data);
        if (det == null) {
            img.setVerificationStatus(VerificationStatus.PENDING);
            img.setFlagReason("AI screening was unavailable - needs manual review.");
        } else {
            img.setDetectraVerdict(det.verdict());
            img.setDetectraConfidence(det.probability());
            img.setDetectraCheckedAt(Instant.now());
            if (det.probability() >= rejectThreshold) {
                img.setVerificationStatus(VerificationStatus.FLAGGED);
                img.setFlagReason(String.format(Locale.ROOT, "Detectra v3: %.0f%% probability AI-generated.", det.probability() * 100));
                img.setRejectionReason(String.format(Locale.ROOT,
                        "We're %.0f%% confident this image was AI-generated. GlamHub only shows real work by real artists. If this is your own photo, please contact support and we'll review it.",
                        det.probability() * 100));
            }
        }

        // An unscreened upload (det == null) is never auto-published; it waits for a human.
        if (det != null && img.getVerificationStatus() != VerificationStatus.FLAGGED) {
            String dup = findDuplicate(artist, sha, phash);
            if (dup != null) {
                img.setVerificationStatus(VerificationStatus.FLAGGED);
                img.setFlagReason("Duplicate photo detected.");
                img.setRejectionReason(dup);
            } else {
                img.setVerificationStatus(VerificationStatus.VERIFIED);
            }
        }
        return toDto(images.save(img));
    }

    private String findDuplicate(User artist, String sha, Long phash) {
        var exact = images.findFirstByContentHashAndVerificationStatus(sha, VerificationStatus.VERIFIED);
        if (exact.isPresent()) return messageFor(artist, exact.get());
        if (phash != null) {
            for (PortfolioImage other : images.findByVerificationStatusAndPerceptualHashIsNotNull(VerificationStatus.VERIFIED)) {
                if (ImageScreeningService.hamming(phash, other.getPerceptualHash()) <= maxDistance) return messageFor(artist, other);
            }
        }
        return null;
    }

    private String messageFor(User artist, PortfolioImage other) {
        return other.getArtist().getId().equals(artist.getId())
                ? "This looks like a photo you've already uploaded to your portfolio."
                : "This photo looks the same as one already published by another artist. Please upload only your own work.";
    }

    public List<PortfolioDto> mine(User artist) {
        return images.findByArtistIdOrderByCreatedAtDesc(artist.getId()).stream().map(this::toDto).toList();
    }

    public List<PortfolioDto> publicFor(Long artistId) {
        return images.findByArtistIdAndVerificationStatusOrderByCreatedAtDesc(artistId, VerificationStatus.VERIFIED)
                .stream().map(this::toDto).toList();
    }

    /** Recent verified portfolio photos from any artist, for the home page animation. */
    public List<PortfolioDto> showcase(int limit) {
        int n = Math.max(1, Math.min(limit, 40));
        List<PortfolioImage> recent = new java.util.ArrayList<>(images.recentVerified(PageRequest.of(0, 400)));
        java.util.Collections.shuffle(recent);
        // Spread across artists: at most one photo per artist first, then top up if there are fewer artists than slots.
        java.util.Set<Long> artists = new java.util.HashSet<>();
        List<PortfolioImage> picked = new java.util.ArrayList<>();
        for (PortfolioImage i : recent) if (picked.size() < n && artists.add(i.getArtist().getId())) picked.add(i);
        for (PortfolioImage i : recent) if (picked.size() < n && !picked.contains(i)) picked.add(i);
        return picked.stream().map(this::toDto).toList();
    }

    @Transactional
    public PortfolioDto update(User artist, Long id, String caption, PortfolioCategory category) {
        PortfolioImage i = owned(artist, id);
        if (caption != null) i.setCaption(caption.isBlank() ? null : caption.trim());
        if (category != null) i.setCategory(category);
        return toDto(images.save(i));
    }

    @Transactional
    public void delete(User artist, Long id) {
        PortfolioImage i = owned(artist, id);
        files.deleteByUrl(i.getImageUrl());
        images.delete(i);
    }

    private PortfolioImage owned(User artist, Long id) {
        PortfolioImage i = images.findById(id).orElseThrow(() -> ApiException.notFound("Photo not found."));
        if (!i.getArtist().getId().equals(artist.getId())) throw ApiException.forbidden("That isn't your photo.");
        return i;
    }

    // ---------- admin side ----------
    public List<AdminPhotoDto> adminList(String status) {
        List<PortfolioImage> list;
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) list = images.findAllByOrderByCreatedAtDesc();
        else list = images.findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus.valueOf(status.toUpperCase()));
        return list.stream().map(this::toAdminDto).toList();
    }

    @Transactional
    public AdminPhotoDto approve(Long id) {
        PortfolioImage i = images.findById(id).orElseThrow(() -> ApiException.notFound("Photo not found."));
        i.setVerificationStatus(VerificationStatus.VERIFIED);
        i.setRejectionReason(null);
        i.setFlagReason("Approved by an admin.");
        return toAdminDto(images.save(i));
    }

    @Transactional
    public AdminPhotoDto reject(Long id, String note) {
        PortfolioImage i = images.findById(id).orElseThrow(() -> ApiException.notFound("Photo not found."));
        i.setVerificationStatus(VerificationStatus.FLAGGED);
        i.setFlagReason("Rejected by an admin.");
        i.setRejectionReason(note == null || note.isBlank()
                ? "A GlamHub moderator removed this photo from your portfolio. Please upload original, real work." : note.trim());
        return toAdminDto(images.save(i));
    }

    @Transactional
    public AdminPhotoDto deepCheck(Long id) {
        if (!screening.deepCheckAvailable()) throw ApiException.badRequest("The AI deep check isn't configured.");
        PortfolioImage i = images.findById(id).orElseThrow(() -> ApiException.notFound("Photo not found."));
        byte[] data = readStored(i.getImageUrl());
        DeepCheck r = screening.deepCheck(data, i.getImageUrl().substring(i.getImageUrl().lastIndexOf('/') + 1));
        if (r == null) throw ApiException.badRequest("The deep check service couldn't analyse that photo right now.");
        i.setAiCheckVerdict(r.verdict());
        i.setAiCheckConfidence(r.confidence());
        i.setAiCheckAt(Instant.now());
        return toAdminDto(images.save(i));
    }

    private byte[] readStored(String url) { return files.read(url); }
}
