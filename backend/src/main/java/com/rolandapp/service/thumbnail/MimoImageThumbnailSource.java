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
 * Slaat een bruggetje naar mimo-international.com: voor tonen waarvan de
 * Wikipedia-pagina geen geschikte thumbnail heeft, levert MIMO een museum-foto
 * (vaak 800–1600px) die we lokaal cachen. De data komt uit
 * {@code data/mimo_image_references.json}, gegenereerd door
 * {@code scripts/scrape_mimo.py}.
 *
 * <p>Order 3: eerder dan Wikipedia (10) zodat een kwalitatieve museum-foto
 * de voorkeur krijgt boven een 300px icoontje, maar later dan de eigen
 * site-images (order 5) zodat onze eigen site-content voorgaat.
 */
@Component
public class MimoImageThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(MimoImageThumbnailSource.class);

    private final Path mimoFile;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Map<String, MimoEntry> byWikiTitle = new HashMap<>();

    public MimoImageThumbnailSource(@Value("${app.thumbnails.mimo-refs:./data/mimo_image_references.json}") String mimoFilePath) {
        this.mimoFile = Path.of(mimoFilePath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void loadRefs() {
        if (!Files.exists(mimoFile)) {
            log.info("MimoImageThumbnailSource: {} niet gevonden, bron levert niets", mimoFile);
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(mimoFile.toFile());
            JsonNode matches = root.path("matches");
            if (!matches.isObject()) {
                log.warn("MIMO JSON heeft geen 'matches' object, bron levert niets");
                return;
            }
            Map<String, MimoEntry> tmp = new HashMap<>();
            for (var entry : matches.properties()) {
                String wikiTitle = entry.getKey();
                JsonNode arr = entry.getValue();
                if (!arr.isArray() || arr.isEmpty()) continue;
                JsonNode first = arr.get(0);
                String imageUrl = first.path("image_url").asText(null);
                if (imageUrl == null || imageUrl.isBlank()) continue;
                tmp.put(wikiTitle, new MimoEntry(
                        first.path("mimo_id").asText(null),
                        first.path("detail_url").asText(null),
                        imageUrl));
            }
            byWikiTitle = tmp;
            log.info("MimoImageThumbnailSource: {} wiki-titels geladen uit {}", byWikiTitle.size(), mimoFile);
        } catch (Exception e) {
            log.warn("Kon mimo_image_references.json niet lezen: {}", e.getMessage());
        }
    }

    @Override
    public int order() {
        return 5;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String title = tone.getWikipediaPageTitle();
        if (title == null || title.isBlank()) return Optional.empty();
        MimoEntry entry = byWikiTitle.get(title);
        if (entry == null) return Optional.empty();
        // MIMO images zijn meestal al >1000px. We vragen 1200 aan zodat
        // next/image efficient kan downscalen zonder quality-verlies.
        return Optional.of(new Candidate(entry.imageUrl(), "mimo", 1200, 0));
    }

    @Override
    public boolean hdOnly() {
        // MIMO levert al originele museum-foto's (typisch 1000-2000px),
        // dus dezelfde URL kan ook als HD dienen. We markeren deze bron
        // als HD-capable; de HdThumbnailResolver gebruikt dezelfde lookup.
        return true;
    }

    private record MimoEntry(String mimoId, String detailUrl, String imageUrl) {}
}
