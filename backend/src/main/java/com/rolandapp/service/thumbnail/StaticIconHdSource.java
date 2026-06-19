package com.rolandapp.service.thumbnail;

import com.rolandapp.model.Tone;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * HD-tegenhanger van {@link StaticIconThumbnailSource}: hetzelfde
 * SVG-icoon in de HD-ladder, zodat de hover-preview en de lightbox ook
 * werken voor tonen die alleen een statisch icoon hebben. SVG is
 * vector, dus "HD" is hier letterlijk gratis. Order 40: alleen wanneer
 * MIMO (5) en Wikipedia (10) niets opleveren.
 */
@Component
public class StaticIconHdSource implements ThumbnailSource {

    private final StaticIconThumbnailSource iconSource;

    public StaticIconHdSource(StaticIconThumbnailSource iconSource) {
        this.iconSource = iconSource;
    }

    @Override
    public int order() {
        return 40;
    }

    @Override
    public boolean hdOnly() {
        return true;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        return iconSource.lookup(tone);
    }
}
