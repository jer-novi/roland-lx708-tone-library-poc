package com.rolandapp.service.thumbnail;

import com.fasterxml.jackson.databind.JsonNode;
import com.rolandapp.model.Tone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Optional;

/**
 * Tweede poging in de ladder: Wikipedia Action API met
 * {@code prop=pageimages}. Sommige pagina's leveren via summary geen
 * thumbnail maar hebben wél een pageimages-antwoord. Default breedte is
 * 800px zodat we direct iets bruikbaars downloaden.
 */
@Component
public class WikiPageImagesThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(WikiPageImagesThumbnailSource.class);
    private static final int DEFAULT_WIDTH = 800;

    private final WebClient wikipediaClient;
    private final String actionBaseUrl;

    public WikiPageImagesThumbnailSource(WebClient wikipediaClient,
                                         @Value("${app.wikipedia.base-url}") String wikipediaRestBaseUrl) {
        this.wikipediaClient = wikipediaClient;
        this.actionBaseUrl = wikipediaRestBaseUrl.replace("/api/rest_v1", "");
    }

    @Override
    public int order() {
        return 20;
    }

    @Override
    public Optional<Candidate> lookup(Tone tone) {
        String title = tone.getWikipediaPageTitle();
        if (title == null || title.isBlank()) {
            return Optional.empty();
        }
        try {
            String url = actionBaseUrl
                    + "/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail"
                    + "&pithumbsize=" + DEFAULT_WIDTH
                    + "&titles=" + title.replace(' ', '_');
            JsonNode body = wikipediaClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block(Duration.ofSeconds(10));
            if (body == null) return Optional.empty();
            JsonNode pages = body.path("query").path("pages");
            if (!pages.isObject()) return Optional.empty();
            for (JsonNode page : pages) {
                if (page.path("missing").asBoolean(false)) return Optional.empty();
                String thumbUrl = page.path("thumbnail").path("source").asText(null);
                if (thumbUrl == null || thumbUrl.isBlank()) return Optional.empty();
                int width = page.path("thumbnail").path("width").asInt(DEFAULT_WIDTH);
                return Optional.of(new Candidate(thumbUrl, "wiki-pageimages", width));
            }
            return Optional.empty();
        } catch (WebClientResponseException e) {
            log.debug("pageimages lookup failed for tone {}: HTTP {}", tone.getId(), e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("pageimages lookup failed for tone {}: {}", tone.getId(), e.getMessage());
            return Optional.empty();
        }
    }
}
