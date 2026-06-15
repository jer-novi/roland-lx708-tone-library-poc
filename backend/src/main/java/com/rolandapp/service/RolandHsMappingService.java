package com.rolandapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Lookup-service voor de Roland→HS-mapping uit Fase 1.2. Keyed by
 * composite "Category|tn<number>" (zoals "Piano|tn1" of "Other|tn42").
 * Geeft per tone de lijst van HS-paden (van root-family tot leaf)
 * terug, klaar om door {@link HsTreeService#resolvePath} naar
 * namen te worden vertaald.
 */
@Service
public class RolandHsMappingService {

    private static final Logger log = LoggerFactory.getLogger(RolandHsMappingService.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, JsonNode> byCompositeKey = new HashMap<>();

    @PostConstruct
    void load() {
        try (InputStream in = new ClassPathResource("data/roland_hs_mapping.json").getInputStream()) {
            JsonNode root = objectMapper.readTree(in);
            JsonNode matches = root.path("matches");
            if (!matches.isObject()) {
                log.warn("roland_hs_mapping.json heeft geen 'matches' object");
                return;
            }
            for (var entry : matches.properties()) {
                byCompositeKey.put(entry.getKey(), entry.getValue());
            }
            log.info("RolandHsMappingService: {} tones geladen", byCompositeKey.size());
        } catch (Exception e) {
            log.error("Kon roland_hs_mapping.json niet laden vanuit classpath", e);
        }
    }

    /**
     * @return HS-paden voor deze tone, bv. [["3","32","321.322"]] voor Piano.
     *         Lege lijst als de tone geen mapping heeft.
     */
    public List<List<String>> hsPathsFor(String category, int toneNumber) {
        if (category == null) return List.of();
        // Het JSON-bestand gebruikt keys zoals "Piano|1" (geen "tn"-prefix).
        String key = category + "|" + toneNumber;
        JsonNode entry = byCompositeKey.get(key);
        if (entry == null) return List.of();
        JsonNode paths = entry.path("hs_paths");
        if (!paths.isArray()) return List.of();
        List<List<String>> result = new ArrayList<>();
        for (JsonNode path : paths) {
            if (!path.isArray()) continue;
            List<String> codes = new ArrayList<>();
            for (JsonNode code : path) {
                codes.add(code.asText(""));
            }
            result.add(codes);
        }
        return result;
    }

    /**
     * Handy helper voor HS-paden op een bestaande Tone-entiteit.
     */
    public Optional<List<String>> firstHsPath(String category, int toneNumber) {
        List<List<String>> all = hsPathsFor(category, toneNumber);
        return all.isEmpty() ? Optional.empty() : Optional.of(all.get(0));
    }
}
