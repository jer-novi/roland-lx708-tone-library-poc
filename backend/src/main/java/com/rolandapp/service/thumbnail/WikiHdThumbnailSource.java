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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HD-variant van Wikipedia: vraagt de pageimages-info aan met
 * {@code pithumbsize=1600} (max 2560) zodat we een hogere resolutie van
 * dezelfde afbeelding krijgen dan de 800px van
 * {@link WikiSummaryThumbnailSource}.
 *
 * <p>Wikimedia's thumb-server schaalt tot 2560px; we vragen 1600px aan
 * zodat de bestandsgrootte binnen het 12MB-cap van de HD-storage blijft.
 */
@Component
public class WikiHdThumbnailSource implements ThumbnailSource {

    private static final Logger log = LoggerFactory.getLogger(WikiHdThumbnailSource.class);
    private static final int HD_WIDTH = 1600;
    /** Wikimedia-thumb-URL formaat: /thumb/a/bb/File.jpg/{WIDTH}px-File.jpg */
    private static final Pattern THUMB_PATTERN =
            Pattern.compile("^(https?://upload\\.wikimedia\\.org/wikipedia/commons/thumb/[^/]+/.+?)/(\\d+)px-(.+)$");

    private final WebClient wikipediaClient;
    private final String actionBaseUrl;

    public WikiHdThumbnailSource(WebClient wikipediaClient,
                                 @Value("${app.wikipedia.base-url}") String wikipediaRestBaseUrl) {
        this.wikipediaClient = wikipediaClient;
        this.actionBaseUrl = wikipediaRestBaseUrl.replace("/api/rest_v1", "");
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
        // Wordt aangeroepen door HdThumbnailResolver (omdat hdOnly() true is).
        String title = tone.getWikipediaPageTitle();
        if (title == null || title.isBlank()) return Optional.empty();
        try {
            String url = actionBaseUrl
                    + "/w/api.php?action=query&format=json&prop=pageimages&piprop=original"
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
                String origUrl = page.path("original").path("source").asText(null);
                if (origUrl == null || origUrl.isBlank()) return Optional.empty();
                int origWidth = page.path("original").path("width").asInt(0);
                int origHeight = page.path("original").path("height").asInt(0);
                // Cap requested width at HD_WIDTH; als original < HD_WIDTH
                // dan is de original al klein genoeg en gebruiken we die.
                String hdUrl = origWidth > 0 && origWidth > HD_WIDTH
                        ? upscaleThumbUrl(origUrl, HD_WIDTH)
                        : origUrl;
                return Optional.of(new Candidate(hdUrl, "wiki-hd", HD_WIDTH, origHeight));
            }
            return Optional.empty();
        } catch (WebClientResponseException e) {
            log.debug("wiki-hd pageimages lookup failed for tone {}: HTTP {}", tone.getId(), e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.debug("wiki-hd pageimages lookup failed for tone {}: {}", tone.getId(), e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Vervangt de breedte in een standaard Wikimedia thumb-URL. Als de
     * URL niet aan het patroon voldoet geeft het de originele URL terug.
     */
    private static String upscaleThumbUrl(String thumbUrl, int width) {
        Matcher m = THUMB_PATTERN.matcher(thumbUrl);
        if (!m.matches()) return thumbUrl;
        return m.group(1) + "/" + width + "px-" + m.group(3);
    }
}
