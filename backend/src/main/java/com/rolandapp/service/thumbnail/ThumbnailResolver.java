package com.rolandapp.service.thumbnail;

import com.rolandapp.model.Tone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Loopt de ladder van {@link ThumbnailSource}s af, in {@code order()},
 * downloadt de eerste succesvolle match via {@link ThumbnailStorage} en
 * geeft het relatieve pad + dimensies terug. Dit is het enige punt dat
 * weet welke bronnen er bestaan; nieuwe bronnen (Flickr, Strapi, AI)
 * hoeven alleen maar {@code @Component} te zijn en de interface te
 * implementeren.
 */
@Component
public class ThumbnailResolver {

    private static final Logger log = LoggerFactory.getLogger(ThumbnailResolver.class);

    private final List<ThumbnailSource> sources;
    private final ThumbnailStorage storage;

    public ThumbnailResolver(List<ThumbnailSource> sources, ThumbnailStorage storage) {
        this.sources = sources.stream()
                .filter(s -> !s.hdOnly())
                .sorted(Comparator.comparingInt(ThumbnailSource::order))
                .toList();
        this.storage = storage;
    }

    public Optional<Resolved> resolve(Tone tone) {
        for (ThumbnailSource source : sources) {
            Optional<ThumbnailSource.Candidate> candidate = source.lookup(tone);
            if (candidate.isEmpty()) continue;
            Optional<ThumbnailStorage.StoredThumbnail> stored =
                    storage.downloadAndStore(candidate.get().externalUrl());
            if (stored.isEmpty()) {
                log.debug("Source {} gaf een URL, maar download faalde voor tone {}",
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
