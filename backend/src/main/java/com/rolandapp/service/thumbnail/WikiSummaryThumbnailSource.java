package com.rolandapp.service.thumbnail;

import com.fasterxml.jackson.databind.JsonNode;
import com.rolandapp.model.Tone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/**
 * Wikipedia-bron in de SD-ladder, via het standaard summary-endpoint.
 * Het {@code thumbnail.source} veld is maar ~330px; voor een scherpe
 * card-thumbnail herschrijven we de URL naar een 960px-thumb (een
 * whitelisted maat, zie {@link WikimediaThumbUrl}) op basis van
 * {@code originalimage}. Is de original zelf ≤960px, dan downloaden we
 * die direct.
 */
@Component
public class WikiSummaryThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(WikiSummaryThumbnailSource.class);
    private static final int SD_WIDTH = 960;

    private final WebClient wikipediaClient;
    private final String actionBaseUrl;

    public WikiSummaryThumbnailSource(WebClient wikipediaClient,
                                      @Value("${app.wikipedia.base-url}") String wikipediaRestBaseUrl) {
        this.wikipediaClient = wikipediaClient;
        this.actionBaseUrl = wikipediaRestBaseUrl.replace("/api/rest_v1", "");
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String title = tone.getWikipediaPageTitle();
        if (title == null || title.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode summary = wikipediaClient.get()
                    .uri("/page/summary/{title}", title.replace(' ', '_'))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(1)))
                    .block(Duration.ofSeconds(15));
            if (summary == null) return Optional.empty();
            JsonNode original = summary.path("originalimage");
            String origUrl = original.path("source").asText(null);
            int origWidth = original.path("width").asInt(0);
            int origHeight = original.path("height").asInt(0);
            if (origUrl != null && origWidth > SD_WIDTH) {
                String thumbUrl = WikimediaThumbUrl.forWidth(origUrl, SD_WIDTH);
                if (thumbUrl != null) {
                    int scaledHeight = origHeight > 0
                            ? Math.round(origHeight * (SD_WIDTH / (float) origWidth))
                            : 0;
                    return Optional.of(new Candidate(thumbUrl, "wiki-summary", SD_WIDTH, scaledHeight));
                }
            }
            if (origUrl != null && origWidth > 0) {
                // Original is al ≤960px (of niet herschrijfbaar, bv. SVG):
                // download de original zelf.
                return Optional.of(new Candidate(origUrl, "wiki-summary", origWidth, origHeight));
            }
            // Geen originalimage: val terug op de kleine summary-thumbnail
            // met de dimensies die Wikipedia zelf opgeeft.
            JsonNode thumb = summary.path("thumbnail");
            String url = thumb.path("source").asText(null);
            if (url == null || url.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new Candidate(url, "wiki-summary",
                    thumb.path("width").asInt(0), thumb.path("height").asInt(0)));
        } catch (WebClientResponseException e) {
            log.debug("wiki-summary lookup failed for tone {}: HTTP {}", tone.getId(), e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("wiki-summary lookup failed for tone {}: {}", tone.getId(), e.getMessage());
            return Optional.empty();
        }
    }
}
