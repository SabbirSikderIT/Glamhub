package com.glamhub.config;

import com.glamhub.model.Enums.LookLevel;
import com.glamhub.model.Enums.Role;
import com.glamhub.model.Media.ColorPalette;
import com.glamhub.model.Media.MakeupLook;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Idempotent startup seeding: the main admin and the starter Suggestions content. */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PaletteRepository palettes;
    private final LookRepository looks;
    private final PasswordEncoder encoder;

    @Value("${app.main-admin-email}") private String adminEmail;
    @Value("${app.main-admin-password}") private String adminPassword;

    @Override
    public void run(String... args) {
        if (!users.existsByEmailIgnoreCase(adminEmail)) {
            users.save(User.builder().role(Role.ADMIN).name("GlamHub Admin").email(adminEmail.toLowerCase())
                    .passwordHash(encoder.encode(adminPassword)).verified(true).build());
            log.info("Created main admin account {}", adminEmail);
        }
        if (palettes.count() == 0) seedPalettes();
        if (looks.count() == 0) seedLooks();
    }

    private void palette(String name, String occasion, String skin, String desc, String swatches, String names, String tips) {
        palettes.save(ColorPalette.builder().name(name).occasion(occasion).skinTone(skin).description(desc)
                .swatches(swatches).swatchNames(names).tips(tips).build());
    }

    private void seedPalettes() {
        palette("Rose Petal Bride", "Bridal", "ALL", "A romantic, soft-focus palette of dusty roses and warm mauves that photographs beautifully in wedding light.",
                "#f4cfd0,#e8a0a8,#c97b84,#9c4f5e,#f7e3d4", "Blush veil,Rose bloom,Dusty rose,Wine petal,Soft cream",
                "Use the cream as an all-over lid shade, rose on the crease, and press the wine petal into the lash line. Match lips to the rose bloom.");
        palette("Golden Hour Glow", "Bridal", "MEDIUM", "Warm bronze, champagne and peach for a sun-kissed bride with a radiant, dewy finish.",
                "#f6e0b8,#e9b872,#c98b4b,#a15f32,#f2a98c", "Champagne,Honey gold,Bronze,Burnt copper,Peach flush",
                "Pat honey gold on the centre of the lid for dimension. Warm peach blush high on the cheeks mimics sunlight.");
        palette("Everyday Natural", "Casual", "ALL", "Barely-there neutrals that even out your look without feeling like makeup.",
                "#f3dcd0,#e2bfae,#c9a08c,#a67c6a,#e8b4a0", "Porcelain,Sand,Latte,Cocoa,Soft coral",
                "Blend latte through the crease, add a tiny touch of cocoa at the outer corner, and finish with a tinted balm in soft coral.");
        palette("Berry Evening", "Party", "FAIR", "Jewel-toned plums and berries that pop against fair skin for night-time events.",
                "#e9c6d7,#c1789d,#8e3b66,#5c2147,#d94f70", "Orchid mist,Berry,Plum,Midnight plum,Raspberry",
                "Keep the base light and let a berry lip lead. Smudge plum along the upper lashes for definition.");
        palette("Deep Bronze Royale", "Party", "DEEP", "Rich golds, coppers and chocolate that glow on deep skin tones.",
                "#f0c987,#d99a3d,#b3622b,#6e3b24,#c4414a", "Liquid gold,Amber,Copper,Espresso,Ruby red",
                "Apply a gold shimmer with your fingertip for maximum payoff and pair it with a ruby red lip.");
        palette("Festive Magenta", "Festive", "MEDIUM", "Bright, joyful pinks and oranges made for Eid, Pohela Boishakh and mehndi nights.",
                "#fbd3e0,#f08fb0,#e0407d,#f28c38,#ffd166", "Candy floss,Hot pink,Magenta,Marigold,Sunshine",
                "Wing the marigold out with a thin liner and keep cheeks soft so the colour on the eyes stays the star.");
        palette("Mauve Minimal", "Casual", "MEDIUM", "A calm, office-friendly mauve story: polished, soft and fuss-free.",
                "#ecd5dc,#cfa3b3,#a8798c,#7d5568,#d9b5a3", "Lilac mist,Soft mauve,Dusty mauve,Plum smoke,Warm beige",
                "One wash of soft mauve, one coat of mascara and a mauve lip is all you need.");
        palette("Smoky Noir", "Party", "ALL", "Classic smoke in charcoal and taupe for dramatic evening glam.",
                "#d9d2cf,#a79b98,#6f6462,#3b3433,#1a1717", "Pearl,Taupe,Stone,Charcoal,Noir",
                "Build the smoke in thin layers and keep the lip nude so it stays elegant.");
    }

    private void look(LookLevel level, String title, String desc, String steps, String bestFor, String products, String lip, String eye, String blush) {
        looks.save(MakeupLook.builder().level(level).title(title).description(desc).steps(steps).bestFor(bestFor)
                .products(products).lipColor(lip).eyeColor(eye).blushColor(blush).build());
    }

    private void seedLooks() {
        look(LookLevel.LIGHT, "Fresh Skin Natural", "A breathable, skin-first look that lets you look like yourself on your best day.",
                "Skin prep and light moisturiser|Skin tint or sheer foundation|Conceal only where needed|Cream blush on the cheeks|Brush up brows, curl lashes, one coat of mascara|Tinted lip balm",
                "College, office, daytime outings, casual family gatherings", "Skin tint, concealer, cream blush, mascara, tinted balm", "#e8a0a0", "#d9b8a4", "#f0a9a0");
        look(LookLevel.LIGHT, "Dewy Day Glow", "Soft, luminous and ready in ten minutes, with a hint of shimmer on the high points.",
                "Hydrating primer|Light-coverage base|Highlighter on cheekbones|Neutral wash on lids|Gloss",
                "Brunch, short events, graduation photos", "Hydrating primer, glow drops, shimmer highlighter, lip gloss", "#e58c93", "#e6c9b4", "#f4b4a8");
        look(LookLevel.MEDIUM, "Soft Glam", "A polished, camera-friendly look with defined eyes, sculpted cheeks and a confident lip.",
                "Primer and medium-coverage foundation|Set with powder in the T-zone|Contour and blush|Two-tone eyeshadow with winged liner|Lashes or two coats of mascara|Defined lip with liner",
                "Engagement, holud, birthday dinners, guest at weddings", "Foundation, contour stick, blush, palette, liner, lipstick", "#c4566f", "#9c6b66", "#e48a8f");
        look(LookLevel.MEDIUM, "Cut-Crease Evening", "Defined crease and a satin lip for evenings where you want to be noticed.",
                "Full base with concealer|Shape a soft cut crease|Shimmer on the lid|Winged liner and lashes|Sculpted cheeks|Satin lip",
                "Parties, receptions, photoshoots", "Concealer, eyeshadow palette, gel liner, lashes, satin lipstick", "#b83f5e", "#7e5470", "#d97b8a");
        look(LookLevel.HEAVY, "Full Bridal Glam", "Long-wear, HD-ready coverage with sculpted features, dramatic eyes and a statement lip that lasts all day.",
                "Skin prep and long-wear primer|Full-coverage HD foundation|Baking and setting spray|Strong contour, highlight and blush|Layered eyeshadow with glitter accents|Individual or strip lashes|Lip liner, lipstick and gloss",
                "Bridal, reception, wedding photography", "HD foundation, setting powder, setting spray, lashes, glitter, long-wear lipstick", "#a52a45", "#6b3b4a", "#e0687e");
        look(LookLevel.HEAVY, "Editorial Drama", "Bold colour and graphic shapes for fashion shoots, stage and fearless statement looks.",
                "Flawless matte base|Bold graphic liner or colour blocking|Pigmented eyeshadows applied wet|Defined lashes|Sculpted face and bold lip",
                "Fashion shoots, stage, creative photoshoots", "Matte foundation, pigments, graphic liner, bold lipstick", "#7d1f4a", "#2f5d8a", "#d46a8c");
    }
}
