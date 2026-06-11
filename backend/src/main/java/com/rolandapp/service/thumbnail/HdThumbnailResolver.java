package com.rolandapp.service.thumbnail;

import com.rolandapp.model.Tone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * HD-tegenhanger van {@link ThumbnailResolver}. Loopt alleen over
 * {@link ThumbnailSource}s waar {@link ThumbnailSource#hdOnly()} true is,
 * downloadt via {@link HdThumbnailStorage} en geeft het relatieve pad
 * terug dat uiteindelijk in {@code wiki_data.thumbnail_hd_path} belandt.
 *
 * <p>De HD-ladder:
 * <ol>
 *   <li>5: MIMO (museum-foto, gemeten 320-1253px)</li>
 *   <li>10: Wikipedia (1920px-thumb van de originalimage)</li>
 * </ol>
 *
 * <p>Bronnen kunnen liegen over hun resolutie, dus na elke download wordt
 * de werkelijke breedte gemeten ({@link ImageDimensionProbe}). Een
 * kandidaat onder {@link #MIN_ACCEPT_WIDTH} wordt niet meteen
 * geaccepteerd: de resolver probeert eerst de volgende bron en valt pas
 * op de beste te kleine kandidaat terug als niets de drempel haalt.
 * De gemeten dimensies (niet de aangevraagde) gaan naar de database.
 */
@Component
public class HdThumbnailResolver {

    private static final Logger log = LoggerFactory.getLogger(HdThumbnailResolver.class);
    /** Onder deze gemeten breedte zoeken we verder naar een scherpere bron. */
    private static final int MIN_ACCEPT_WIDTH = 1200;

    private final List<ThumbnailSource> hdSources;
    private final HdThumbnailStorage storage;

    public HdThumbnailResolver(List<ThumbnailSource> allSources, HdThumbnailStorage storage) {
        this.hdSources = allSources.stream()
                .filter(ThumbnailSource::hdOnly)
                .sorted(Comparator.comparingInt(ThumbnailSource::order))
                .toList();
        this.storage = storage;
        log.info("HdThumbnailResolver: {} HD-bronnen actief: {}",
                hdSources.size(),
                hdSources.stream().map(s -> s.getClass().getSimpleName()).toList());
    }

    public Optional<Resolved> resolve(Tone tone) {
        Resolved best = null;
        for (ThumbnailSource source : hdSources) {
            Optional<ThumbnailSource.Candidate> candidate = source.lookup(tone);
            if (candidate.isEmpty()) continue;
            Optional<HdThumbnailStorage.StoredThumbnail> stored =
                    storage.downloadAndStore(candidate.get().externalUrl());
            if (stored.isEmpty()) {
                log.debug("HD source {} gaf een URL, maar download faalde voor tone {}",
                        candidate.get().sourceTag(), tone.getId());
                continue;
            }
            Optional<ImageDimensionProbe.Dimensions> measured = ImageDimensionProbe.probe(
                    storage.getStorageDir().resolve(stored.get().relativePath()));
            Resolved resolved = new Resolved(
                    stored.get().relativePath(),
                    candidate.get().sourceTag(),
                    measured.map(ImageDimensionProbe.Dimensions::width)
                            .orElse(candidate.get().desiredWidth()),
                    measured.map(ImageDimensionProbe.Dimensions::height)
                            .orElse(candidate.get().desiredHeight()));
            // Niet-meetbaar formaat (SVG is schaalbaar): meteen accepteren.
            if (measured.isEmpty() || resolved.width() >= MIN_ACCEPT_WIDTH) {
                return Optional.of(resolved);
            }
            log.debug("HD source {} gaf maar {}px voor tone {}, probeer volgende bron",
                    resolved.sourceTag(), resolved.width(), tone.getId());
            if (best == null || resolved.width() > best.width()) {
                best = resolved;
            }
        }
        return Optional.ofNullable(best);
    }

    public record Resolved(String relativePath, String sourceTag, int width, int height) {}
}
