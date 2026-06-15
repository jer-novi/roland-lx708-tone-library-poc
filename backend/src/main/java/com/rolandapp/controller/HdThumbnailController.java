package com.rolandapp.controller;

import com.rolandapp.service.thumbnail.HdThumbnailStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Serveert HD-thumbnails onder {@code /api/wiki-thumbs-hd/{filename}}.
 * Zelfde pad-traversal bescherming als {@code ThumbnailController}.
 * Cache-control is agressiever (1 jaar) omdat HD-images idempotent
 * gegenereerd worden en nooit hoeven te veranderen.
 */
@RestController
@RequestMapping("/api/wiki-thumbs-hd")
public class HdThumbnailController {

    private final Path storageDir;

    public HdThumbnailController(HdThumbnailStorage storage) {
        this.storageDir = storage.getStorageDir();
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) {
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid filename");
        }
        Path file = storageDir.resolve(filename).normalize();
        if (!file.startsWith(storageDir) || !Files.exists(file) || Files.isDirectory(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Resource resource = new PathResource(file);
        return ResponseEntity.ok()
                .contentType(mediaTypeFor(file))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .body(resource);
    }

    private static MediaType mediaTypeFor(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (name.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        if (name.endsWith(".svg")) return MediaType.parseMediaType("image/svg+xml");
        return MediaType.IMAGE_JPEG;
    }
}
