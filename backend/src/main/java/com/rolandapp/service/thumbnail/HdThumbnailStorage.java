package com.rolandapp.service.thumbnail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Identiek aan {@link ThumbnailStorage} maar schrijft naar een aparte
 * HD-directory (typisch {@code ./data/wiki-thumbs-hd}) en wordt geserveerd
 * onder {@code /api/wiki-thumbs-hd/}. De split bestaat zodat we op disk
 * makkelijk kunnen zien welke images HD zijn en ze met een langere
 * cache-control header kunnen aanbieden.
 *
 * <p>Geen aparte WebClient: we hergebruiken dezelfde User-Agent als de
 * reguliere ThumbnailStorage door hier zelf een client te bouwen met
 * dezelfde UA-string.
 */
@Component
public class HdThumbnailStorage {

    private static final Logger log = LoggerFactory.getLogger(HdThumbnailStorage.class);
    private static final long MAX_BYTES = 12L * 1024 * 1024; // 12 MB cap — HD kan ~1600-3000px JPEG zijn

    private final WebClient downloadClient;
    private final Path storageDir;

    public HdThumbnailStorage(@Value("${app.thumbnails.hd-storage-dir:./data/wiki-thumbs-hd}") String storageDirPath) {
        this.storageDir = Path.of(storageDirPath).toAbsolutePath().normalize();
        this.downloadClient = WebClient.builder()
                .defaultHeader(HttpHeaders.USER_AGENT,
                        "RolandLX708ToneLibrary/0.1 (https://github.com/jer-novi/roland-lx708-tone-library-poc)")
                .build();
        try {
            Files.createDirectories(this.storageDir);
        } catch (IOException e) {
            throw new IllegalStateException("Kan HD thumbnail-map niet aanmaken: " + this.storageDir, e);
        }
    }

    public Path getStorageDir() {
        return storageDir;
    }

    public Optional<StoredThumbnail> downloadAndStore(String externalUrl) {
        if (externalUrl == null || externalUrl.isBlank()) {
            return Optional.empty();
        }
        String ext = guessExtension(externalUrl);
        String filename = sha1(externalUrl) + ext;
        Path target = storageDir.resolve(filename);
        if (Files.exists(target)) {
            log.debug("HD thumbnail cache hit: {}", filename);
            return Optional.of(new StoredThumbnail(filename, probeSize(target)));
        }
        if (externalUrl.startsWith("file:")) {
            return copyLocalFile(externalUrl, target, filename);
        }
        return downloadRemote(externalUrl, target, filename);
    }

    private Optional<StoredThumbnail> copyLocalFile(String fileUrl, Path target, String filename) {
        try {
            Path source = Path.of(URI.create(fileUrl));
            if (!Files.exists(source)) {
                log.debug("Local HD thumbnail source missing: {}", source);
                return Optional.empty();
            }
            long size = Files.size(source);
            if (size > MAX_BYTES) {
                log.warn("Local HD thumbnail over size cap ({} bytes): {}", size, source);
                return Optional.empty();
            }
            Files.copy(source, target);
            return Optional.of(new StoredThumbnail(filename, size));
        } catch (Exception e) {
            log.debug("Local HD thumbnail copy failed for {}: {}", fileUrl, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<StoredThumbnail> downloadRemote(String externalUrl, Path target, String filename) {
        try {
            byte[] body = downloadClient.get()
                    .uri(URI.create(externalUrl).toString())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, resp ->
                            resp.bodyToMono(String.class)
                                    .defaultIfEmpty("")
                                    .flatMap(errorBody -> Mono.error(new IllegalStateException(
                                            "HTTP " + resp.statusCode().value() + " for HD thumbnail"))))
                    .bodyToMono(byte[].class)
                    .block(Duration.ofSeconds(30));
            if (body == null || body.length == 0) {
                return Optional.empty();
            }
            if (body.length > MAX_BYTES) {
                log.warn("HD thumbnail over size cap ({} bytes), skipping: {}", body.length, externalUrl);
                return Optional.empty();
            }
            Files.write(target, body);
            return Optional.of(new StoredThumbnail(filename, body.length));
        } catch (Exception e) {
            log.debug("HD thumbnail download failed for {}: {}", externalUrl, e.getMessage());
            return Optional.empty();
        }
    }

    private static long probeSize(Path file) {
        try {
            return Files.size(file);
        } catch (IOException e) {
            return 0L;
        }
    }

    private static String guessExtension(String url) {
        String lower = url.toLowerCase();
        if (lower.contains(".svg")) return ".svg";
        if (lower.contains(".png")) return ".png";
        if (lower.contains(".webp")) return ".webp";
        if (lower.contains(".jpg") || lower.contains(".jpeg")) return ".jpg";
        return ".img";
    }

    private static String sha1(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 niet beschikbaar", e);
        }
    }

    public record StoredThumbnail(String relativePath, long sizeBytes) {}
}
