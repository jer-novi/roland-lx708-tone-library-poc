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
 * Eerste poging in de thumbnail-ladder: een lokaal gedownloade image
 * van de 'allthemusicalinstrumentsoftheworld'-site. De images staan in
 * {@code data/instrument-images/&lt;category&gt;__&lt;toneNumber&gt;.jpg}
 * (gegenereerd door scripts/download_instrument_images.py).
 *
 * <p>Het is de bedoeling dat we deze bestanden bundelen in de
 * deployment zodat ze offline beschikbaar zijn — geen netwerk-calls,
 * geen rate limits, geen licentie-issues. Voor tonen waar geen lokale
 * image bestaat valt de ladder door naar Wikipedia.
 *
 * <p>Dimensies worden gelezen uit een sidecar-JSON
 * ({@code dimensions.json}) om geen ImageIO/AWT nodig te hebben in de
 * headless JRE-container.
 */
@Component
public class LocalFileThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(LocalFileThumbnailSource.class);

    private final Path imagesDir;
    private final Path sidecarPath;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Map<String, DimensionInfo> dimensions = new HashMap<>();

    public LocalFileThumbnailSource(@Value("${app.thumbnails.local-images-dir:./data/instrument-images}") String imagesDirPath) {
        this.imagesDir = Path.of(imagesDirPath).toAbsolutePath().normalize();
        this.sidecarPath = this.imagesDir.resolve("dimensions.json");
    }

    @PostConstruct
    void loadSidecar() {
        if (!Files.exists(sidecarPath)) {
            log.info("LocalFileThumbnailSource: geen dimensions.json naast images-dir, valt terug op 0×0");
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(sidecarPath.toFile());
            for (var entry : root.properties()) {
                JsonNode val = entry.getValue();
                int w = val.path("width").asInt(0);
                int h = val.path("height").asInt(0);
                dimensions.put(entry.getKey(), new DimensionInfo(w, h));
            }
            log.info("LocalFileThumbnailSource: {} dimensies geladen uit {}", dimensions.size(), sidecarPath);
        } catch (Exception e) {
            log.warn("Kon dimensions.json niet lezen: {}", e.getMessage());
        }
    }

    @Override
    public int order() {
        return 5;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String key = tone.getCategory().getName() + "|" + tone.getToneNumber();
        String safeCat = tone.getCategory().getName().replace(' ', '_');
        String filename = safeCat + "__" + tone.getToneNumber() + ".jpg";
        Path file = imagesDir.resolve(filename);
        if (!Files.exists(file) || !Files.isRegularFile(file)) {
            return Optional.empty();
        }
        DimensionInfo dim = dimensions.get(key);
        int width = dim != null ? dim.width() : 0;
        int height = dim != null ? dim.height() : 0;
        String fileUrl = file.toUri().toString();
        return Optional.of(new Candidate(fileUrl, "site-instruments", width, height));
    }

    private record DimensionInfo(int width, int height) {}
}
