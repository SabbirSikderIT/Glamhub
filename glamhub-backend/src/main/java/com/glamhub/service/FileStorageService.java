package com.glamhub.service;

import com.glamhub.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Stores uploaded images. When Cloudinary is configured every image goes to the Cloudinary folder and the stored URL is the
 * Cloudinary delivery URL; otherwise images are written to the local upload directory and served from /uploads.
 */
@Service
@Slf4j
public class FileStorageService {
    private final Path dir;
    private final String baseUrl;
    private final CloudinaryClient cloud;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir, @Value("${app.base-url}") String baseUrl,
                              CloudinaryClient cloud) throws IOException {
        this.dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.cloud = cloud;
        Files.createDirectories(dir);
        log.info("Image storage: {}", cloud.isConfigured() ? "Cloudinary" : "local disk (" + dir + ")");
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

    /** Saves the image and returns its public URL. */
    public String save(byte[] data) {
        String id = UUID.randomUUID().toString();
        if (cloud.isConfigured()) {
            try {
                return cloud.upload(data, id);
            } catch (Exception e) {
                log.error("Cloudinary upload failed", e);
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Our image storage is unavailable right now. Please try again in a moment.");
            }
        }
        String name = id + extensionFor(data);
        try {
            Files.write(dir.resolve(name), data);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store upload", e);
        }
        return baseUrl + "/uploads/" + name;
    }

    /** Returns the bytes of a stored image (from Cloudinary or the local directory). */
    public byte[] read(String url) {
        try {
            if (url != null && url.startsWith("http") && !url.startsWith(baseUrl + "/uploads/")) return cloud.download(url);
            String name = Paths.get(url.substring(url.lastIndexOf('/') + 1)).getFileName().toString();
            return Files.readAllBytes(dir.resolve(name));
        } catch (Exception e) {
            throw ApiException.notFound("The photo file is missing on the server.");
        }
    }

    public void deleteByUrl(String url) {
        if (url == null) return;
        if (cloud.owns(url)) { cloud.delete(url); return; }
        if (!url.contains("/uploads/")) return;
        String name = Paths.get(url.substring(url.lastIndexOf('/') + 1)).getFileName().toString();
        try {
            Files.deleteIfExists(dir.resolve(name));
        } catch (IOException ignored) { }
    }
}
