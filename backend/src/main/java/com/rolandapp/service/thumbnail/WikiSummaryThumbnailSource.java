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
 * Eerste poging in de ladder: het standaard Wikipedia-summary-endpoint.
 * Geeft de {@code thumbnail.source} uit de JSON terug (meestal ~300px
 * breed). De eigenlijke download + format-conversie naar een grotere
 * versie gebeurt in {@code ThumbnailStorage}.
 */
@Component
public class WikiSummaryThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(WikiSummaryThumbnailSource.class);

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
            JsonNode thumb = summary.path("thumbnail");
            String url = thumb.path("source").asText(null);
            if (url == null || url.isBlank()) {
                return Optional.empty();
            }
            int width = thumb.path("width").asInt(800);
            int height = thumb.path("height").asInt(0);
            // Vraag 800px aan zodat de opslag direct een bruikbaar HD-formaat
            // binnenhaalt — next/image schaalt 'm efficient terug.
            return Optional.of(new Candidate(url, "wiki-summary", Math.max(width, 800), height));
        } catch (WebClientResponseException e) {
            log.debug("wiki-summary lookup failed for tone {}: HTTP {}", tone.getId(), e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("wiki-summary lookup failed for tone {}: {}", tone.getId(), e.getMessage());
            return Optional.empty();
        }
    }
}
