package com.glamhub.controller;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Enums.AvailabilityStatus;
import com.glamhub.model.Enums.PortfolioCategory;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.User;
import com.glamhub.service.*;
import com.glamhub.util.CurrentUser;
import com.glamhub.util.Districts;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Public discovery plus the artist's own workspace (profile, packages, portfolio, calendar). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ArtistController {
    private final ArtistService artists;
    private final CatalogService catalog;
    private final PortfolioService portfolio;
    private final ReviewService reviews;

    static User requireArtist() {
        User u = CurrentUser.require();
        if (u.getRole() != Role.ARTIST) throw ApiException.forbidden("This area is for makeup artists.");
        return u;
    }

    // ---------- public ----------
    @GetMapping("/artists/districts")
    public Map<String, List<String>> districts() { return Districts.BY_DIVISION; }

    @GetMapping("/artists/slots")
    public List<String> slots() { return BookingService.slots(); }

    @GetMapping({"/artists", "/artists/search"})
    public PageResponse<ArtistSummary> search(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) String district,
                                              @RequestParam(required = false) String budget,
                                              @RequestParam(required = false) String category,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "12") int size) {
        return artists.search(q, district, budget, category, page, size);
    }

    @GetMapping("/artists/me")
    public ArtistDetail me() { return artists.mineWithContact(requireArtist()); }

    @PutMapping("/artists/me")
    public ArtistDetail updateMe(@Valid @RequestBody ArtistUpdateRequest r) { return artists.update(requireArtist(), r); }

    @GetMapping("/artists/{id}")
    public ArtistDetail detail(@PathVariable Long id) { return artists.detail(id); }

    @GetMapping("/artists/{id}/portfolio")
    public List<PortfolioDto> publicPortfolio(@PathVariable Long id) { return portfolio.publicFor(id); }

    @GetMapping("/artists/{id}/packages")
    public List<PackageDto> packages(@PathVariable Long id) { return catalog.packagesOf(id); }

    @GetMapping("/artists/{id}/availability")
    public List<AvailabilityDto> availability(@PathVariable Long id,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return catalog.calendar(id, from, to);
    }

    // ---------- packages ----------
    @GetMapping("/packages")
    public List<PackageDto> myPackages() { return catalog.packagesOf(requireArtist().getId()); }

    @PostMapping("/packages")
    public PackageDto createPackage(@Valid @RequestBody PackageRequest r) { return catalog.createPackage(requireArtist(), r); }

    @PutMapping("/packages/{id}")
    public PackageDto updatePackage(@PathVariable Long id, @Valid @RequestBody PackageRequest r) { return catalog.updatePackage(requireArtist(), id, r); }

    @DeleteMapping("/packages/{id}")
    public Map<String, String> deletePackage(@PathVariable Long id) {
        catalog.deletePackage(requireArtist(), id);
        return Map.of("message", "Package deleted.");
    }

    // ---------- portfolio ----------
    @GetMapping("/portfolio")
    public List<PortfolioDto> myPortfolio() { return portfolio.mine(requireArtist()); }

    @PostMapping(value = "/portfolio", consumes = "multipart/form-data")
    public PortfolioDto upload(@RequestParam("file") MultipartFile file,
                               @RequestParam(required = false) PortfolioCategory category,
                               @RequestParam(required = false) String caption) {
        return portfolio.upload(requireArtist(), file, category, caption);
    }

    @PutMapping("/portfolio/{id}")
    public PortfolioDto updatePhoto(@PathVariable Long id, @RequestBody Map<String, String> body) {
        PortfolioCategory cat = null;
        if (body.get("category") != null) {
            try { cat = PortfolioCategory.valueOf(body.get("category").toUpperCase()); } catch (IllegalArgumentException e) { throw ApiException.badRequest("Unknown category."); }
        }
        return portfolio.update(requireArtist(), id, body.get("caption"), cat);
    }

    @DeleteMapping("/portfolio/{id}")
    public Map<String, String> deletePhoto(@PathVariable Long id) {
        portfolio.delete(requireArtist(), id);
        return Map.of("message", "Photo removed.");
    }

    // ---------- calendar ----------
    @PutMapping("/availability/{date}")
    public AvailabilityDto setAvailability(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                           @Valid @RequestBody AvailabilityUpdate r) {
        return catalog.setStatus(requireArtist(), date, r.status());
    }

    // ---------- reviews ----------
    @GetMapping("/reviews")
    public List<ReviewDto> publicReviews(@RequestParam Long artistId) { return reviews.publicFor(artistId); }

    @GetMapping("/reviews/mine")
    public List<ReviewDto> myReviews() { return reviews.mine(requireArtist()); }

    @PutMapping("/reviews/{id}/reply")
    public ReviewDto reply(@PathVariable Long id, @Valid @RequestBody ReplyRequest r) { return reviews.reply(requireArtist(), id, r.reply()); }

    @PostMapping("/reviews")
    public ReviewDto createReview(@Valid @RequestBody ReviewCreateRequest r, @RequestParam(required = false) String key) {
        return reviews.create(r, key);
    }
}
