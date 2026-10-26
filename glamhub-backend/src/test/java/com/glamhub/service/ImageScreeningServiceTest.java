package com.glamhub.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class ImageScreeningServiceTest {
    private final ImageScreeningService svc = new ImageScreeningService("models/does-not-exist.onnx", "");

    private byte[] image(int w, int h, long seed, String format) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setPaint(new GradientPaint(0, 0, new Color((int) (seed * 37 % 255), 40, 120), w, h, new Color(200, (int) (seed * 91 % 255), 90)));
        g.fillRect(0, 0, w, h);
        java.util.Random r = new java.util.Random(seed);
        for (int i = 0; i < 25; i++) {
            g.setColor(new Color(r.nextInt(256), r.nextInt(256), r.nextInt(256), 150));
            g.fillOval(r.nextInt(w), r.nextInt(h), 30 + r.nextInt(w / 3), 30 + r.nextInt(h / 3));
        }
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    @Test
    void sha256IsStableAndKnown() {
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", svc.sha256("abc".getBytes()));
    }

    @Test
    void sameImageReEncodedAndResizedIsWithinDuplicateDistance() throws Exception {
        byte[] original = image(600, 750, 5, "jpg");
        BufferedImage src = ImageIO.read(new java.io.ByteArrayInputStream(original));
        BufferedImage small = new BufferedImage(300, 375, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = small.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(src, 0, 0, 300, 375, null);
        g.dispose();
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(small, "png", png);
        long a = svc.perceptualHash(original);
        long b = svc.perceptualHash(png.toByteArray());
        assertTrue(ImageScreeningService.hamming(a, b) <= 6, "distance " + ImageScreeningService.hamming(a, b));
    }

    @Test
    void differentImagesAreFarApart() throws Exception {
        long a = svc.perceptualHash(image(600, 750, 5, "jpg"));
        long b = svc.perceptualHash(image(600, 750, 99, "jpg"));
        assertTrue(ImageScreeningService.hamming(a, b) > 6, "distance " + ImageScreeningService.hamming(a, b));
    }

    @Test
    void undecodableBytesGiveNoHashAndNoVerdict() {
        assertNull(svc.perceptualHash("not an image".getBytes()));
        assertNull(svc.detect("not an image".getBytes()));
    }

    @Test
    void missingModelMeansUploadsWaitForManualReview() throws Exception {
        assertFalse(svc.detectraAvailable());
        assertNull(svc.detect(image(100, 100, 1, "png")));
    }

    @Test
    void missingExifIsOnlyANote() throws Exception {
        assertNull(svc.readExif(image(100, 100, 1, "png")));
    }
}
