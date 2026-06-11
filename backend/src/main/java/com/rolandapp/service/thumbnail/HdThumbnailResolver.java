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
 * <p>Het HD-ladder is bewust klein gehouden:
 * <ol>
 *   <li>3: lokaal (site-images, al hoge resolutie)</li>
 *   <li>5: MIMO (museum-foto, vaak al 1000-2000px)</li>
 *   <li>10: Wikipedia (1600px via pageimages-original)</li>
 * </ol>
 */
@Component
public class HdThumbnailResolver {

    private static final Logger log = LoggerFactory.getLogger(HdThumbnailResolver.class);

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
            return Optional.of(new Resolved(
                    stored.get().relativePath(),
                    candidate.get().sourceTag(),
                    candidate.get().desiredWidth(),
                    candidate.get().desiredHeight()));
        }
        return Optional.empty();
    }

    public record Resolved(String relativePath, String sourceTag, int width, int height) {}
}
