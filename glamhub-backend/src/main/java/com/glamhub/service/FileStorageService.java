package com.glamhub.service;

import com.glamhub.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {
    private final Path dir;
    private final String baseUrl;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir, @Value("${app.base-url}") String baseUrl) throws IOException {
        this.dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        Files.createDirectories(dir);
    }

    /** Reads the upload fully and checks the real file signature (not just the declared content type). */
    public byte[] readImage(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose a photo to upload.");
        try {
            byte[] data = file.getBytes();
            if (extensionFor(data) == null) throw ApiException.badRequest("Only JPG and PNG photos are supported.");
            return data;
        } catch (IOException e) {
            throw ApiException.badRequest("We couldn't read that file.");
        }
    }

    private String extensionFor(byte[] d) {
        if (d.length > 3 && (d[0] & 0xFF) == 0xFF && (d[1] & 0xFF) == 0xD8 && (d[2] & 0xFF) == 0xFF) return ".jpg";
        if (d.length > 8 && (d[0] & 0xFF) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G') return ".png";
        return null;
    }

    /** Saves the bytes as {UUID}{ext} and returns the public URL. */
    public String save(byte[] data) {
        String name = UUID.randomUUID() + extensionFor(data);
        try {
            Files.write(dir.resolve(name), data);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store upload", e);
        }
        return baseUrl + "/uploads/" + name;
    }

    public void deleteByUrl(String url) {
        if (url == null || !url.contains("/uploads/")) return;
        String name = Paths.get(url.substring(url.lastIndexOf('/') + 1)).getFileName().toString();
        try {
            Files.deleteIfExists(dir.resolve(name));
        } catch (IOException ignored) { }
    }
}
