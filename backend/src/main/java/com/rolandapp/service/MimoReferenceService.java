package com.rolandapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Read-only lookup-service voor {@code mimo_image_references.json}.
 * Gebruikt door zowel {@link com.rolandapp.service.thumbnail.MimoImageThumbnailSource}
 * (voor de SD/HD image-URL) als door {@link com.rolandapp.service.WikiService}
 * (om de "Bekijk op MIMO"-knop in de detail-modal te kunnen tonen).
 *
 * <p>Keyed by wikipediaPageTitle; geeft de eerste match terug (de dataset
 * heeft max 1 entry per titel).
 */
@Service
public class MimoReferenceService {

    private static final Logger log = LoggerFactory.getLogger(MimoReferenceService.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, MimoEntry> byWikiTitle = new HashMap<>();

    @PostConstruct
    void load() {
        try (InputStream in = new ClassPathResource("data/mimo_image_references.json").getInputStream()) {
            JsonNode root = objectMapper.readTree(in);
            JsonNode matches = root.path("matches");
            if (!matches.isObject()) {
                log.warn("MIMO JSON heeft geen 'matches' object");
                return;
            }
            for (var entry : matches.properties()) {
                String wikiTitle = entry.getKey();
                JsonNode arr = entry.getValue();
                if (!arr.isArray() || arr.isEmpty()) continue;
                JsonNode first = arr.get(0);
                byWikiTitle.put(wikiTitle, new MimoEntry(
                        first.path("mimo_id").asText(null),
                        first.path("detail_url").asText(null),
                        first.path("image_url").asText(null)));
            }
            log.info("MimoReferenceService: {} wiki-titels geladen", byWikiTitle.size());
        } catch (Exception e) {
            log.error("Kon mimo_image_references.json niet laden vanuit classpath", e);
        }
    }

    public Optional<MimoEntry> findByWikiTitle(String wikiTitle) {
        if (wikiTitle == null) return Optional.empty();
        return Optional.ofNullable(byWikiTitle.get(wikiTitle));
    }

    /** Eerste match voor een wiki-titel. */
    public record MimoEntry(String mimoId, String detailUrl, String imageUrl) {}
}
