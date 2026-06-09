package com.rolandapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.rolandapp.dto.WikiDataDto;
import com.rolandapp.exception.NotFoundException;
import com.rolandapp.exception.UpstreamException;
import com.rolandapp.model.Tone;
import com.rolandapp.model.WikiData;
import com.rolandapp.repository.ToneRepository;
import com.rolandapp.repository.WikiDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Fetches instrument background info from the Wikipedia REST API and caches it
 * in the wiki_data table. Content older than {@link #STALE_AFTER_DAYS} days is
 * refreshed on the next request; a manual refresh can be forced per tone.
 */
@Service
public class WikiService {

    private static final Logger log = LoggerFactory.getLogger(WikiService.class);
    private static final int STALE_AFTER_DAYS = 30;

    private final WebClient wikipediaClient;
    private final ToneRepository toneRepository;
    private final WikiDataRepository wikiDataRepository;
    private final long bulkDelayMs;

    public WikiService(WebClient wikipediaClient,
                       ToneRepository toneRepository,
                       WikiDataRepository wikiDataRepository,
                       @Value("${app.wikipedia.bulk-delay-ms:250}") long bulkDelayMs) {
        this.wikipediaClient = wikipediaClient;
        this.toneRepository = toneRepository;
        this.wikiDataRepository = wikiDataRepository;
        this.bulkDelayMs = bulkDelayMs;
    }

    @Transactional
    public WikiDataDto getWikiData(Long toneId, boolean forceRefresh) {
        Tone tone = toneRepository.findById(toneId)
                .orElseThrow(() -> new NotFoundException("Tone " + toneId + " not found"));
        if (tone.getWikipediaPageTitle() == null) {
            throw new NotFoundException("Tone '" + tone.getName() + "' has no Wikipedia page mapping");
        }

        WikiData wikiData = wikiDataRepository.findByToneId(toneId).orElse(null);
        boolean stale = wikiData == null
                || wikiData.getLastFetchedAt() == null
                || wikiData.getLastFetchedAt().isBefore(Instant.now().minus(STALE_AFTER_DAYS, ChronoUnit.DAYS))
                || !wikiData.getPageTitle().equals(tone.getWikipediaPageTitle());

        if (forceRefresh || stale) {
            wikiData = fetchAndStore(tone, wikiData);
        }
        return WikiDataDto.from(wikiData);
    }

    /**
     * Fetches wiki data for every tone that has a page title but no stored
     * content yet. Sequential with a small delay so we stay well within
     * Wikipedia's rate limits. Returns the number of tones refreshed.
     */
    @Transactional
    public int refreshMissing() {
        List<Tone> tones = toneRepository.findAll().stream()
                .filter(t -> t.getWikipediaPageTitle() != null)
                .filter(t -> wikiDataRepository.findByToneId(t.getId()).isEmpty())
                .toList();
        int refreshed = 0;
        for (Tone tone : tones) {
            try {
                fetchAndStore(tone, null);
                refreshed++;
                Thread.sleep(bulkDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Skipping wiki refresh for tone '{}' ({}): {}",
                        tone.getName(), tone.getWikipediaPageTitle(), e.getMessage());
            }
        }
        log.info("Bulk wiki refresh done: {}/{} tones refreshed", refreshed, tones.size());
        return refreshed;
    }

    private WikiData fetchAndStore(Tone tone, WikiData existing) {
        String title = tone.getWikipediaPageTitle();
        JsonNode summary = fetchSummary(title);
        String html = fetchHtml(title);

        WikiData wikiData = existing != null ? existing : new WikiData(tone, title);
        wikiData.setPageTitle(title);
        wikiData.setSummary(summary.path("extract").asText(null));
        wikiData.setFullHtml(html);
        wikiData.setSourceUrl(summary.path("content_urls").path("desktop").path("page").asText(null));
        wikiData.setLastFetchedAt(Instant.now());
        return wikiDataRepository.save(wikiData);
    }

    private JsonNode fetchSummary(String pageTitle) {
        try {
            return wikipediaClient.get()
                    .uri("/page/summary/{title}", pageTitle.replace(' ', '_'))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                            .filter(WikiService::isRetryable))
                    .block(Duration.ofSeconds(15));
        } catch (WebClientResponseException.NotFound e) {
            throw new NotFoundException("Wikipedia page '" + pageTitle + "' not found");
        } catch (Exception e) {
            throw new UpstreamException("Wikipedia summary request failed for '" + pageTitle + "'", e);
        }
    }

    private String fetchHtml(String pageTitle) {
        try {
            return wikipediaClient.get()
                    .uri("/page/html/{title}", pageTitle.replace(' ', '_'))
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(1))
                            .filter(WikiService::isRetryable))
                    .block(Duration.ofSeconds(20));
        } catch (WebClientResponseException.NotFound e) {
            // Summary existed but HTML endpoint missing: keep the summary
            log.warn("No HTML available for Wikipedia page '{}'", pageTitle);
            return null;
        } catch (Exception e) {
            throw new UpstreamException("Wikipedia HTML request failed for '" + pageTitle + "'", e);
        }
    }

    private static boolean isRetryable(Throwable t) {
        if (t instanceof WebClientResponseException e) {
            return e.getStatusCode().is5xxServerError() || e.getStatusCode().value() == 429;
        }
        return true;
    }
}
