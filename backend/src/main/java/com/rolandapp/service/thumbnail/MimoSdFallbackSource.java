package com.rolandapp.service.thumbnail;

import com.rolandapp.model.Tone;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Laatste trede van de SD-ladder: dezelfde MIMO museum-foto als de
 * HD-ladder gebruikt, maar dan als card-thumbnail. Bestaat voor tonen
 * waarvan de Wikipedia-pagina geen enkele afbeelding heeft (synth-leads,
 * pads, orchestra hits, ...): zonder deze fallback kregen die wél een
 * HD-image maar bleef de card op het fallback-icoon staan.
 *
 * <p>Order 30: uitsluitend wanneer de eigen site-images (3) én Wikipedia
 * (10/20) niets opleveren. Delegeert aan {@link MimoImageThumbnailSource}
 * zodat de mapping-data maar op één plek geladen wordt; die bron zelf is
 * {@code hdOnly} en doet dus niet mee in deze ladder.
 */
@Component
public class MimoSdFallbackSource implements ThumbnailSource {

    private final MimoImageThumbnailSource mimoSource;

    public MimoSdFallbackSource(MimoImageThumbnailSource mimoSource) {
        this.mimoSource = mimoSource;
    }

    @Override
    public int order() {
        return 30;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        return mimoSource.lookup(tone);
    }
}
