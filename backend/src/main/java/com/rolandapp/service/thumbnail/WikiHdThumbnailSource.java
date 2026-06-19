package com.rolandapp.service.thumbnail;

import com.fasterxml.jackson.databind.JsonNode;
import com.rolandapp.model.Tone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Optional;

/**
 * HD-variant van Wikipedia. Gebruikt het REST-summary-endpoint
 * ({@code /page/summary/{title}}) en leest daar het {@code originalimage}
 * veld: dat is er voor vrijwel elke pagina met een afbeelding, terwijl de
 * Action-API ({@code prop=pageimages&piprop=original}) voor veel
 * instrument-pagina's (bv. "Grand piano") géén pageimage teruggeeft.
 *
 * <p>Als de original breder is dan {@link #HD_WIDTH} construeren we een
 * thumb-URL via {@link WikimediaThumbUrl}, zodat we niet de volledige
 * original (soms tientallen MB's, boven de 12MB-cap van de HD-storage)
 * hoeven te downloaden. Wikimedia accepteert alleen whitelisted breedtes;
 * 1920 is de grootste die gegarandeerd werkt.
 */
@Component
public class WikiHdThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(WikiHdThumbnailSource.class);
    private static final int HD_WIDTH = 1920;

    private final WebClient wikipediaClient;

    public WikiHdThumbnailSource(WebClient wikipediaClient) {
        this.wikipediaClient = wikipediaClient;
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public boolean hdOnly() {
        // HD-resolver pakt deze bron op; de SD-resolver slaat 'm over
        // door de !hdOnly() filter in ThumbnailResolver.
        return true;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String title = tone.getWikipediaPageTitle();
        if (title == null || title.isBlank()) return Optional.empty();
        try {
            JsonNode summary = wikipediaClient.get()
                    .uri("/page/summary/{title}", title.replace(' ', '_'))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block(Duration.ofSeconds(15));
            if (summary == null) return Optional.empty();
            JsonNode original = summary.path("originalimage");
            String origUrl = original.path("source").asText(null);
            if (origUrl == null || origUrl.isBlank()) return Optional.empty();
            int origWidth = original.path("width").asInt(0);
            int origHeight = original.path("height").asInt(0);
            if (origWidth > HD_WIDTH) {
                String thumbUrl = WikimediaThumbUrl.forWidth(origUrl, HD_WIDTH);
                if (thumbUrl != null) {
                    int scaledHeight = origHeight > 0
                            ? Math.round(origHeight * (HD_WIDTH / (float) origWidth))
                            : 0;
                    return Optional.of(new Candidate(thumbUrl, "wiki-hd", HD_WIDTH, scaledHeight));
                }
                // Geen thumb construeerbaar (SVG/TIFF): probeer de original;
                // de 12MB-cap van HdThumbnailStorage vangt extreme gevallen.
            }
            return Optional.of(new Candidate(origUrl, "wiki-hd", origWidth, origHeight));
        } catch (WebClientResponseException e) {
            log.debug("wiki-hd summary lookup failed for tone {}: HTTP {}", tone.getId(), e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("wiki-hd summary lookup failed for tone {}: {}", tone.getId(), e.getMessage());
            return Optional.empty();
        }
    }
}
