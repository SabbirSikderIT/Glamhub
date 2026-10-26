package com.glamhub.controller;

import com.glamhub.dto.Dtos.*;
import com.glamhub.model.Media.ColorPalette;
import com.glamhub.model.Media.MakeupLook;
import com.glamhub.service.*;
import com.glamhub.util.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Everything under /api/admin. Staff-only at the URL level; the most sensitive actions are re-checked in the services. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService admin;
    private final ReviewService reviews;
    private final PortfolioService portfolio;
    private final AccountService accounts;
    private final ContentService content;
    private final SettingsService settings;
    private final MainAdminGuard guard;

    @GetMapping("/overview")
    public Map<String, Object> overview() { return admin.overview(); }

    @GetMapping("/whoami")
    public Map<String, Object> whoami() { return Map.of("mainAdmin", guard.isMain(CurrentUser.require())); }

    // ---------- reviews ----------
    @GetMapping("/reviews")
    public List<ReviewDto> reviews() { return reviews.adminList(); }

    @PutMapping("/reviews/{id}/remove")
    public ReviewDto removeReview(@PathVariable Long id) { return reviews.adminRemove(id); }

    // ---------- photos ----------
    @GetMapping("/photos")
    public List<AdminPhotoDto> photos(@RequestParam(required = false) String status) { return portfolio.adminList(status); }

    @PutMapping("/photos/{id}/approve")
    public AdminPhotoDto approve(@PathVariable Long id) { return portfolio.approve(id); }

    @PutMapping("/photos/{id}/reject")
    public AdminPhotoDto reject(@PathVariable Long id, @RequestBody(required = false) AdminNoteRequest b) {
        return portfolio.reject(id, b == null ? null : b.note());
    }

    @PostMapping("/photos/{id}/ai-check")
    public AdminPhotoDto aiCheck(@PathVariable Long id) { return portfolio.deepCheck(id); }

    // ---------- users ----------
    @GetMapping("/users")
    public List<Map<String, Object>> users(@RequestParam(required = false) String role) { return admin.users(role); }

    @PutMapping("/users/{id}/verify")
    public Map<String, Object> verify(@PathVariable Long id) { return admin.verify(id); }

    @PutMapping("/users/{id}/ban")
    public Map<String, String> ban(@PathVariable Long id) {
        admin.ban(id);
        return Map.of("message", "User banned and removed.");
    }

    @DeleteMapping("/users/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        admin.delete(id);
        return Map.of("message", "User removed.");
    }

    // ---------- deletion requests ----------
    @GetMapping("/deletion-requests")
    public List<Map<String, Object>> deletionRequests() { return accounts.adminQueue(); }

    @PutMapping("/deletion-requests/{id}/approve")
    public Map<String, String> approveDeletion(@PathVariable Long id) {
        accounts.approveDeletion(id);
        return Map.of("message", "Account deleted.");
    }

    @PutMapping("/deletion-requests/{id}/reject")
    public Map<String, String> rejectDeletion(@PathVariable Long id, @RequestBody(required = false) AdminNoteRequest b) {
        accounts.rejectDeletion(id, b == null ? null : b.note());
        return Map.of("message", "Request declined.");
    }

    // ---------- suggestions content ----------
    @PostMapping("/palettes")
    public ColorPalette createPalette(@Valid @RequestBody PaletteRequest r) { return content.savePalette(null, r); }

    @PutMapping("/palettes/{id}")
    public ColorPalette updatePalette(@PathVariable Long id, @Valid @RequestBody PaletteRequest r) { return content.savePalette(id, r); }

    @DeleteMapping("/palettes/{id}")
    public Map<String, String> deletePalette(@PathVariable Long id) {
        content.deletePalette(id);
        return Map.of("message", "Palette deleted.");
    }

    @PostMapping("/looks")
    public MakeupLook createLook(@Valid @RequestBody LookRequest r) { return content.saveLook(null, r); }

    @PutMapping("/looks/{id}")
    public MakeupLook updateLook(@PathVariable Long id, @Valid @RequestBody LookRequest r) { return content.saveLook(id, r); }

    @PostMapping(value = "/looks/{id}/image", consumes = "multipart/form-data")
    public MakeupLook lookImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) { return content.setLookImage(id, file); }

    @DeleteMapping("/looks/{id}/image")
    public MakeupLook removeLookImage(@PathVariable Long id) { return content.removeLookImage(id); }

    @DeleteMapping("/looks/{id}")
    public Map<String, String> deleteLook(@PathVariable Long id) {
        content.deleteLook(id);
        return Map.of("message", "Look deleted.");
    }

    // ---------- main admin only (enforced inside the services) ----------
    @GetMapping("/staff")
    public List<Map<String, Object>> staff(@RequestParam String role) { return admin.users(role); }

    @PostMapping("/staff")
    public Map<String, Object> createStaff(@Valid @RequestBody StaffRequest r) { return admin.createStaff(r); }

    @DeleteMapping("/staff/{id}")
    public Map<String, String> deleteStaff(@PathVariable Long id) {
        admin.deleteStaff(id);
        return Map.of("message", "Staff account removed.");
    }

    @GetMapping("/blue-badge/settings")
    public Map<String, Object> badgeSettings() { guard.require(); return Map.of("price", settings.badgePrice()); }

    @PutMapping("/blue-badge/settings")
    public Map<String, Object> updateBadgePrice(@Valid @RequestBody PriceRequest r) { return Map.of("price", settings.updateBadgePrice(r.price())); }

    @GetMapping("/blue-badge/holders")
    public List<Map<String, Object>> holders() { return admin.badgeHolders(); }

    @PutMapping("/blue-badge/holders/{id}/revoke")
    public Map<String, String> revoke(@PathVariable Long id) {
        admin.revokeBadge(id);
        return Map.of("message", "Badge revoked.");
    }

    @GetMapping("/booking-money/settings")
    public Map<String, Object> moneySettings() { guard.require(); return Map.of("percent", settings.depositPercent()); }

    @PutMapping("/booking-money/settings")
    public Map<String, Object> updateMoney(@Valid @RequestBody PercentRequest r) { return Map.of("percent", settings.updateDepositPercent(r.percent())); }
}
