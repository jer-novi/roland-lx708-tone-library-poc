package com.rolandapp.service.thumbnail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rolandapp.model.Tone;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Allerlaatste trede van de SD-ladder: een gegenereerd emoji-icoon
 * (SVG) voor tonen waar geen enkele foto-bron iets heeft — GM2
 * sound-effects ("Thunder", "Explosion") en de Do Re Mi-demotonen
 * zonder Wikipedia-titel. De SVG's en de mapping komen uit
 * {@code scripts/generate_static_icons.py}.
 *
 * <p>Lookup: eerst op {@code wikipediaPageTitle}, anders op een prefix
 * van de tone-naam (voor titel-loze tonen). Order 40: élke echte foto
 * (site-images, Wikipedia, MIMO) gaat vóór.
 */
@Component
public class StaticIconThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(StaticIconThumbnailSource.class);
    /** SVG is schaalbaar; 512 is de nominale viewBox-maat van de iconen. */
    private static final int NOMINAL_SIZE = 512;

    private final Path iconsDir;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Map<String, String> byWikiTitle = new HashMap<>();
    private Map<String, String> byNamePrefix = new HashMap<>();

    public StaticIconThumbnailSource(@Value("${app.thumbnails.static-icons-dir:./data/static-icons}") String iconsDirPath) {
        this.iconsDir = Path.of(iconsDirPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void loadMapping() {
        Path mappingFile = iconsDir.resolve("mapping.json");
        if (!Files.exists(mappingFile)) {
            log.info("StaticIconThumbnailSource: {} niet gevonden, bron levert niets", mappingFile);
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(mappingFile.toFile());
            byWikiTitle = toMap(root.path("byWikiTitle"));
            byNamePrefix = toMap(root.path("byNamePrefix"));
            log.info("StaticIconThumbnailSource: {} wiki-titels en {} naam-prefixen geladen uit {}",
                    byWikiTitle.size(), byNamePrefix.size(), mappingFile);
        } catch (Exception e) {
            log.warn("Kon static-icons mapping.json niet lezen: {}", e.getMessage());
        }
    }

    private static Map<String, String> toMap(JsonNode node) {
        Map<String, String> out = new HashMap<>();
        for (var entry : node.properties()) {
            out.put(entry.getKey(), entry.getValue().asText());
        }
        return out;
    }

    @Override
    public int order() {
        return 40;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String filename = null;
        String title = tone.getWikipediaPageTitle();
        if (title != null && !title.isBlank()) {
            filename = byWikiTitle.get(title);
        }
        if (filename == null) {
            String name = tone.getName();
            for (var entry : byNamePrefix.entrySet()) {
                if (name != null && name.startsWith(entry.getKey())) {
                    filename = entry.getValue();
                    break;
                }
            }
        }
        if (filename == null) return Optional.empty();
        Path file = iconsDir.resolve(filename);
        if (!Files.exists(file) || !Files.isRegularFile(file)) {
            return Optional.empty();
        }
        return Optional.of(new Candidate(file.toUri().toString(), "static-icon",
                NOMINAL_SIZE, NOMINAL_SIZE));
    }
}
