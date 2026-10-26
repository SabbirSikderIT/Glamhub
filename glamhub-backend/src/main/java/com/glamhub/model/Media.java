package com.glamhub.model;

import com.glamhub.model.Enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Portfolio photos, makeup guidance content and AI chat history. */
public final class Media {
    private Media() {}

    @Entity(name = "PortfolioImage") @Table(name = "portfolio_images")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PortfolioImage {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private User artist;
        @Column(nullable = false, length = 600) private String imageUrl;
        @Enumerated(EnumType.STRING) @Builder.Default private PortfolioCategory category = PortfolioCategory.CASUAL;
        @Column(length = 500) private String caption;
        @Column(columnDefinition = "text") private String exifData;
        @Enumerated(EnumType.STRING) @Builder.Default private VerificationStatus verificationStatus = VerificationStatus.PENDING;
        /** Admin-facing note. */
        @Column(length = 1000) private String flagReason;
        /** Artist-facing explanation shown when a photo is rejected. */
        @Column(length = 1000) private String rejectionReason;
        private String contentHash;
        private Long perceptualHash;
        private String detectraVerdict;
        private Double detectraConfidence;
        private Instant detectraCheckedAt;
        private String aiCheckVerdict;
        private Double aiCheckConfidence;
        private Instant aiCheckAt;
        @Builder.Default private Instant createdAt = Instant.now();
    }

    @Entity(name = "ColorPalette") @Table(name = "color_palettes")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ColorPalette {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false) private String name;
        /** e.g. Bridal, Everyday, Party, Festive */
        private String occasion;
        /** FAIR, MEDIUM, DEEP, ALL */
        private String skinTone;
        @Column(length = 1500) private String description;
        /** Comma separated hex colours, e.g. "#e8b4b8,#c97b84,#8e4a56". */
        @Column(length = 400) private String swatches;
        /** Comma separated swatch names, same order as swatches. */
        @Column(length = 600) private String swatchNames;
        @Column(length = 1500) private String tips;
    }

    @Entity(name = "MakeupLook") @Table(name = "makeup_looks")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MakeupLook {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Enumerated(EnumType.STRING) @Column(nullable = false) private LookLevel level;
        @Column(nullable = false) private String title;
        @Column(length = 1500) private String description;
        @Column(length = 1500) private String steps;
        @Column(length = 600) private String bestFor;
        @Column(length = 600) private String products;
        /** Optional uploaded photo; if empty the UI draws an illustrated face from the colours below. */
        @Column(length = 600) private String imageUrl;
        private String lipColor;
        private String eyeColor;
        private String blushColor;
    }

    @Entity(name = "AiChatConversation") @Table(name = "ai_chat_conversations")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiChatConversation {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private User user;
        private String title;
        private String mode;
        @Builder.Default private Instant createdAt = Instant.now();
    }

    @Entity(name = "AiChatMessage") @Table(name = "ai_chat_messages")
    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiChatMessage {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @ManyToOne(optional = false) private AiChatConversation conversation;
        @Column(nullable = false) private String role;
        @Column(columnDefinition = "text", nullable = false) private String content;
        @Builder.Default private Instant createdAt = Instant.now();
    }
}
