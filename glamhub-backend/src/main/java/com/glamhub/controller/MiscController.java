package com.glamhub.controller;

import com.glamhub.dto.Dtos.*;
import com.glamhub.model.Business.BlueBadge;
import com.glamhub.model.Media.ColorPalette;
import com.glamhub.model.Media.MakeupLook;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.BlueBadgeRepository;
import com.glamhub.service.*;
import com.glamhub.util.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Blue badge, suggestions content, home-page showcase, account and AI endpoints. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MiscController {
    private final PaymentService payments;
    private final SettingsService settings;
    private final BlueBadgeRepository badges;
    private final ContentService content;
    private final PortfolioService portfolio;
    private final AccountService accounts;
    private final AiService ai;

    // ---------- blue badge ----------
    @GetMapping("/blue-badge/status")
    public Map<String, Object> badgeStatus() {
        User a = ArtistController.requireArtist();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("active", badges.findByArtistId(a.getId()).filter(BlueBadge::isActive).isPresent());
        m.put("price", settings.badgePrice());
        return m;
    }

    @PostMapping("/blue-badge/purchase")
    public PaymentInitResponse purchase() { return payments.initiateBadge(ArtistController.requireArtist()); }

    @RequestMapping(value = "/blue-badge/payment/{outcome}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> badgeCallback(@PathVariable String outcome, @RequestParam Map<String, String> p) {
        String target = payments.badgeCallback(p.get("tran_id"), p.get("val_id"), outcome);
        return ResponseEntity.status(HttpStatus.SEE_OTHER).header(HttpHeaders.LOCATION, URI.create(target).toString()).build();
    }

    // ---------- suggestions / showcase ----------
    @GetMapping("/palettes")
    public List<ColorPalette> palettes() { return content.palettes(); }

    @GetMapping("/looks")
    public List<MakeupLook> looks() { return content.looks(); }

    @GetMapping("/showcase")
    public List<PortfolioDto> showcase(@RequestParam(defaultValue = "12") int limit) { return portfolio.showcase(limit); }

    // ---------- account ----------
    @GetMapping("/account/me")
    public AccountDto me() { return accounts.me(CurrentUser.require()); }

    @PutMapping("/account/me")
    public AccountDto updateMe(@Valid @RequestBody AccountUpdateRequest r) { return accounts.update(CurrentUser.require(), r); }

    @PostMapping(value = "/account/me/photo", consumes = "multipart/form-data")
    public AccountDto photo(@RequestParam("file") MultipartFile file) { return accounts.setPhoto(CurrentUser.require(), file); }

    @GetMapping("/account/deletion-request")
    public Map<String, Object> myDeletion() { return accounts.myDeletionRequest(CurrentUser.require()); }

    @PostMapping("/account/deletion-request")
    public Map<String, Object> requestDeletion(@Valid @RequestBody(required = false) DeletionRequestBody b) {
        return accounts.requestDeletion(CurrentUser.require(), b == null ? null : b.reason());
    }

    @DeleteMapping("/account/deletion-request")
    public Map<String, String> cancelDeletion() {
        accounts.cancelDeletion(CurrentUser.require());
        return Map.of("message", "Request cancelled.");
    }

    // ---------- AI ----------
    @PostMapping("/chatbot/ask")
    public Map<String, String> widget(@Valid @RequestBody ChatbotRequest r) { return Map.of("reply", ai.widget(r.message(), r.history())); }

    @PostMapping("/ai-chat/messages")
    public Map<String, Object> chat(@Valid @RequestBody AiChatRequest r) {
        AiService.ChatResult res = ai.chat(r.conversationId(), r.message(), r.history(), r.mode());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reply", res.reply());
        m.put("conversationId", res.conversationId());
        return m;
    }

    @PostMapping(value = "/ai-chat/transcribe", consumes = "multipart/form-data")
    public Map<String, String> transcribe(@RequestParam("audio") MultipartFile audio) { return Map.of("text", ai.transcribe(audio)); }

    @GetMapping("/ai-chat/conversations")
    public List<Map<String, Object>> conversations() { return ai.myConversations(CurrentUser.require()); }

    @GetMapping("/ai-chat/conversations/{id}/messages")
    public List<Map<String, Object>> conversationMessages(@PathVariable Long id) { return ai.conversationMessages(CurrentUser.require(), id); }

    @DeleteMapping("/ai-chat/conversations/{id}")
    public Map<String, String> deleteConversation(@PathVariable Long id) {
        ai.deleteConversation(CurrentUser.require(), id);
        return Map.of("message", "Conversation deleted.");
    }
}
