package com.rolandapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.rolandapp.dto.WikiDataDto;
import com.rolandapp.exception.NotFoundException;
import com.rolandapp.exception.UpstreamException;
import com.rolandapp.model.Tone;
import com.rolandapp.model.WikiData;
import com.rolandapp.repository.ToneRepository;
import com.rolandapp.repository.WikiDataRepository;
import com.rolandapp.service.thumbnail.HdThumbnailResolver;
import com.rolandapp.service.thumbnail.ThumbnailResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Fetches instrument background info from the Wikipedia REST API and caches it
 * in the wiki_data table. Content older than {@link #STALE_AFTER_DAYS} days is
 * refreshed on the next request; a manual refresh can be forced per tone.
 *
 * <p>SD-thumbnail resolution is delegated to {@link ThumbnailResolver}, which
 * tries each registered {@code ThumbnailSource} in order and downloads a
 * copy of the best candidate to local disk. HD-thumbnail resolution goes
 * through {@link HdThumbnailResolver}. The resulting relative paths are
 * stored in {@code wiki_data.thumbnail_path} / {@code thumbnail_hd_path}
 * and served by {@code ThumbnailController} / {@code HdThumbnailController}.
 */
@Service
public class WikiService {

    private static final Logger log = LoggerFactory.getLogger(WikiService.class);
    private static final int STALE_AFTER_DAYS = 30;

    private final WebClient wikipediaClient;
    private final ToneRepository toneRepository;
    private final WikiDataRepository wikiDataRepository;
    private final TransactionTemplate transactionTemplate;
    private final ThumbnailResolver thumbnailResolver;
    private final HdThumbnailResolver hdThumbnailResolver;
    private final ThumbnailUrlBuilder thumbnailUrlBuilder;
    private final HdThumbnailUrlBuilder hdThumbnailUrlBuilder;
    private final long bulkDelayMs;

    public WikiService(WebClient wikipediaClient,
                       ToneRepository toneRepository,
                       WikiDataRepository wikiDataRepository,
                       TransactionTemplate transactionTemplate,
                       ThumbnailResolver thumbnailResolver,
                       HdThumbnailResolver hdThumbnailResolver,
                       ThumbnailUrlBuilder thumbnailUrlBuilder,
                       HdThumbnailUrlBuilder hdThumbnailUrlBuilder,
                       @Value("${app.wikipedia.bulk-delay-ms:250}") long bulkDelayMs) {
        this.wikipediaClient = wikipediaClient;
        this.toneRepository = toneRepository;
        this.wikiDataRepository = wikiDataRepository;
        this.transactionTemplate = transactionTemplate;
        this.thumbnailResolver = thumbnailResolver;
        this.hdThumbnailResolver = hdThumbnailResolver;
        this.thumbnailUrlBuilder = thumbnailUrlBuilder;
        this.hdThumbnailUrlBuilder = hdThumbnailUrlBuilder;
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
        return WikiDataDto.from(wikiData, thumbnailUrlBuilder, hdThumbnailUrlBuilder);
    }

    /**
     * Fetches wiki data for every tone that has a page title but no stored
     * content yet. Sequential with a small delay so we stay well within
     * Wikipedia's rate limits; each tone commits in its own transaction so an
     * interrupted run keeps everything fetched so far. Returns the number of
     * tones refreshed.
     */
    public int refreshMissing() {
        List<Long> missingIds = findMissingToneIds();
        int refreshed = 0;
        for (Long toneId : missingIds) {
            try {
                Boolean stored = transactionTemplate.execute(status -> {
                    Tone tone = toneRepository.findById(toneId).orElse(null);
                    if (tone == null || tone.getWikipediaPageTitle() == null) {
                        return false;
                    }
                    WikiData existing = wikiDataRepository.findByToneId(toneId).orElse(null);
                    fetchAndStore(tone, existing);
                    return true;
                });
                if (Boolean.TRUE.equals(stored)) {
                    refreshed++;
                }
                Thread.sleep(bulkDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Skipping wiki refresh for tone id {}: {}", toneId, e.getMessage());
            }
        }
        log.info("Bulk wiki refresh done: {}/{} tones refreshed", refreshed, missingIds.size());
        return refreshed;
    }

    /**
     * Voor élke tone met een Wikipedia-titel óf een lokale image: draai de
     * thumbnail-resolver opnieuw en sla het resultaat op. Handig na een
     * schema-migratie of wanneer er een nieuwe {@link com.rolandapp.service.thumbnail.ThumbnailSource}
     * bij komt (bv. de lokale site-images).
     */
    public int refreshAllThumbnails() {
        List<Tone> all = toneRepository.findAll();
        int refreshed = 0;
        for (Tone tone : all) {
            try {
                // Vernieuw binnen een eigen transaction, anders is
                // tone.getCategory() (LAZY) onbereikbaar zodra de outer
                // request-transactie gesloten is.
                transactionTemplate.execute(status -> {
                    Tone attached = toneRepository.findById(tone.getId()).orElse(null);
                    if (attached == null) return null;
                    WikiData existing = wikiDataRepository.findByToneId(attached.getId()).orElse(null);
                    fetchAndStore(attached, existing);
                    return null;
                });
                refreshed++;
                Thread.sleep(bulkDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.warn("Skipping thumbnail refresh for tone id {}: {}", tone.getId(), e.getMessage());
            }
        }
        log.info("Bulk thumbnail refresh done: {}/{} tones refreshed", refreshed, all.size());
        return refreshed;
    }

    /** Tone-ids met een Wikipedia-mapping waarvoor nog geen wiki-data is opgeslagen. */
    @Transactional(readOnly = true)
    public List<Long> findMissingToneIds() {
        return toneRepository.findAll().stream()
                .filter(t -> t.getWikipediaPageTitle() != null)
                .filter(t -> wikiDataRepository.findByToneId(t.getId()).isEmpty())
                .map(Tone::getId)
                .toList();
    }

    private WikiData fetchAndStore(Tone tone, WikiData existing) {
        String title = tone.getWikipediaPageTitle();
        JsonNode summary = fetchSummary(title);
        String html = fetchHtml(title);
        Optional<ThumbnailResolver.Resolved> thumbnail = thumbnailResolver.resolve(tone);
        Optional<HdThumbnailResolver.Resolved> hdThumbnail = hdThumbnailResolver.resolve(tone);

        WikiData wikiData = existing != null ? existing : new WikiData(tone, title);
        wikiData.setPageTitle(title);
        wikiData.setSummary(summary.path("extract").asText(null));
        wikiData.setFullHtml(html);
        wikiData.setSourceUrl(summary.path("content_urls").path("desktop").path("page").asText(null));
        if (thumbnail.isPresent()) {
            ThumbnailResolver.Resolved t = thumbnail.get();
            wikiData.setThumbnailPath(t.relativePath());
            wikiData.setThumbnailSource(t.sourceTag());
            wikiData.setThumbnailWidth(t.width());
            wikiData.setThumbnailHeight(t.height() > 0 ? t.height() : null);
            // Behoud de oude externe URL als reference (niet meer door frontend gebruikt).
            wikiData.setThumbnailUrl(null);
        } else {
            wikiData.setThumbnailPath(null);
            wikiData.setThumbnailSource(null);
            wikiData.setThumbnailWidth(null);
            wikiData.setThumbnailHeight(null);
        }
        if (hdThumbnail.isPresent()) {
            HdThumbnailResolver.Resolved h = hdThumbnail.get();
            wikiData.setThumbnailHdPath(h.relativePath());
            wikiData.setThumbnailHdSource(h.sourceTag());
            wikiData.setThumbnailHdWidth(h.width());
            wikiData.setThumbnailHdHeight(h.height() > 0 ? h.height() : null);
        } else {
            wikiData.setThumbnailHdPath(null);
            wikiData.setThumbnailHdSource(null);
            wikiData.setThumbnailHdWidth(null);
            wikiData.setThumbnailHdHeight(null);
        }
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
