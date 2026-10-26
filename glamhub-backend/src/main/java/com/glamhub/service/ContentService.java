package com.glamhub.service;

import com.glamhub.dto.Dtos.LookRequest;
import com.glamhub.dto.Dtos.PaletteRequest;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Enums.LookLevel;
import com.glamhub.model.Media.ColorPalette;
import com.glamhub.model.Media.MakeupLook;
import com.glamhub.repository.Repositories.LookRepository;
import com.glamhub.repository.Repositories.PaletteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.regex.Pattern;

/** Colour palettes and makeup-look guides shown on the Suggestions page; both are editable by admins. */
@Service
@RequiredArgsConstructor
public class ContentService {
    private static final Pattern HEX = Pattern.compile("#[0-9a-fA-F]{6}");
    private final PaletteRepository palettes;
    private final LookRepository looks;
    private final FileStorageService files;

    public List<ColorPalette> palettes() { return palettes.findAllByOrderByIdAsc(); }
    public List<MakeupLook> looks() { return looks.findAllByOrderByIdAsc(); }

    private String cleanSwatches(String raw) {
        String[] parts = raw.split("\\s*,\\s*");
        for (String p : parts) if (!HEX.matcher(p).matches()) throw ApiException.badRequest("Colours must be hex codes like #e8b4b8, separated by commas.");
        return String.join(",", parts);
    }

    private String hexOrNull(String c) {
        if (c == null || c.isBlank()) return null;
        if (!HEX.matcher(c.trim()).matches()) throw ApiException.badRequest("Colours must be hex codes like #e8b4b8.");
        return c.trim();
    }

    @Transactional
    public ColorPalette savePalette(Long id, PaletteRequest r) {
        ColorPalette p = id == null ? new ColorPalette() : palettes.findById(id).orElseThrow(() -> ApiException.notFound("Palette not found."));
        p.setName(r.name().trim());
        p.setOccasion(r.occasion());
        p.setSkinTone(r.skinTone());
        p.setDescription(r.description());
        p.setSwatches(cleanSwatches(r.swatches()));
        p.setSwatchNames(r.swatchNames());
        p.setTips(r.tips());
        return palettes.save(p);
    }

    @Transactional
    public void deletePalette(Long id) { palettes.deleteById(id); }

    @Transactional
    public MakeupLook saveLook(Long id, LookRequest r) {
        MakeupLook l = id == null ? new MakeupLook() : looks.findById(id).orElseThrow(() -> ApiException.notFound("Look not found."));
        l.setLevel(r.level());
        l.setTitle(r.title().trim());
        l.setDescription(r.description());
        l.setSteps(r.steps());
        l.setBestFor(r.bestFor());
        l.setProducts(r.products());
        l.setLipColor(hexOrNull(r.lipColor()));
        l.setEyeColor(hexOrNull(r.eyeColor()));
        l.setBlushColor(hexOrNull(r.blushColor()));
        return looks.save(l);
    }

    @Transactional
    public MakeupLook setLookImage(Long id, MultipartFile file) {
        MakeupLook l = looks.findById(id).orElseThrow(() -> ApiException.notFound("Look not found."));
        String old = l.getImageUrl();
        l.setImageUrl(files.save(files.readImage(file)));
        looks.save(l);
        files.deleteByUrl(old);
        return l;
    }

    @Transactional
    public MakeupLook removeLookImage(Long id) {
        MakeupLook l = looks.findById(id).orElseThrow(() -> ApiException.notFound("Look not found."));
        files.deleteByUrl(l.getImageUrl());
        l.setImageUrl(null);
        return looks.save(l);
    }

    @Transactional
    public void deleteLook(Long id) {
        looks.findById(id).ifPresent(l -> { files.deleteByUrl(l.getImageUrl()); looks.delete(l); });
    }

    public static LookLevel level(String s) { return LookLevel.valueOf(s.toUpperCase()); }
}
