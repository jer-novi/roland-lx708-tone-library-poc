package com.rolandapp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rolandapp.dto.AudioSampleDto;
import com.rolandapp.dto.FactDto;
import com.rolandapp.dto.InstrumentBackgroundDto;
import com.rolandapp.dto.RelatedToneDto;
import com.rolandapp.dto.ToneCategoryDto;
import com.rolandapp.dto.ToneDetailDto;
import com.rolandapp.dto.ToneDto;
import com.rolandapp.dto.WikiDataDto;
import com.rolandapp.exception.NotFoundException;
import com.rolandapp.model.InstrumentBackground;
import com.rolandapp.model.Tone;
import com.rolandapp.repository.InstrumentBackgroundRepository;
import com.rolandapp.repository.ToneCategoryRepository;
import com.rolandapp.repository.ToneRepository;
import com.rolandapp.repository.WikiDataRepository;
import com.rolandapp.seed.InstrumentBackgroundSeedFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

@Service
@Transactional(readOnly = true)
public class ToneService {

    private static final int SHORT_SUMMARY_LENGTH = 220;

    private final ToneRepository toneRepository;
    private final ToneCategoryRepository categoryRepository;
    private final WikiDataRepository wikiDataRepository;
    private final InstrumentBackgroundRepository backgroundRepository;
    private final ThumbnailUrlBuilder thumbnailUrlBuilder;
    private final HdThumbnailUrlBuilder hdThumbnailUrlBuilder;
    private final ObjectMapper objectMapper;

    public ToneService(ToneRepository toneRepository,
                       ToneCategoryRepository categoryRepository,
                       WikiDataRepository wikiDataRepository,
                       InstrumentBackgroundRepository backgroundRepository,
                       ThumbnailUrlBuilder thumbnailUrlBuilder,
                       HdThumbnailUrlBuilder hdThumbnailUrlBuilder,
                       ObjectMapper objectMapper) {
        this.toneRepository = toneRepository;
        this.categoryRepository = categoryRepository;
        this.wikiDataRepository = wikiDataRepository;
        this.backgroundRepository = backgroundRepository;
        this.thumbnailUrlBuilder = thumbnailUrlBuilder;
        this.hdThumbnailUrlBuilder = hdThumbnailUrlBuilder;
        this.objectMapper = objectMapper;
    }

    /** Backward-compatible default (NL). */
    public List<ToneDto> search(String category, String subCategory, String query) {
        return search(category, subCategory, query, "nl");
    }

    /**
     * The full catalogue is only ~324 rows, so filtering in memory is simpler
     * and faster than dynamic SQL.
     */
    public List<ToneDto> search(String category, String subCategory, String query, String lang) {
        String cat = normalize(category);
        String sub = normalize(subCategory);
        String q = normalize(query);

        Map<Long, WikiDataRepository.WikiCardData> cardData = wikiDataRepository.findAllCardData()
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        WikiDataRepository.WikiCardData::getToneId, Function.identity()));

        return toneRepository.findAllWithCategory().stream()
                .filter(t -> cat == null || t.getCategory().getName().toLowerCase(Locale.ROOT).equals(cat))
                .filter(t -> sub == null || (t.getSubCategory() != null
                        && t.getSubCategory().toLowerCase(Locale.ROOT).equals(sub)))
                .filter(t -> q == null || t.getName().toLowerCase(Locale.ROOT).contains(q))
                .map(t -> {
                    WikiDataRepository.WikiCardData card = cardData.get(t.getId());
                    String url = resolveThumbnailUrl(card);
                    String hdUrl = resolveHdThumbnailUrl(card);
                    Integer width = card != null ? card.getThumbnailWidth() : null;
                    Integer height = card != null ? card.getThumbnailHeight() : null;
                    return ToneDto.from(t, url, width, height,
                            card != null ? truncateAtWord(card.getSummary()) : null, hdUrl,
                            pickLang(t.getOneLinerNl(), t.getOneLinerEn(), lang));
                })
                .toList();
    }

    /**
     * Kiest de beste thumbnail-URL: voorkeur voor lokaal opgeslagen
     * {@code thumbnail_path} (eigen kopie, scherp op alle formaten), valt
     * terug op de oude {@code thumbnail_url} voor rijen die nog via de
     * vorige pipeline zijn opgeslagen.
     */
    String resolveThumbnailUrl(WikiDataRepository.WikiCardData card) {
        if (card == null) return null;
        if (card.getThumbnailPath() != null && !card.getThumbnailPath().isBlank()) {
            return thumbnailUrlBuilder.urlFor(card.getThumbnailPath());
        }
        return card.getThumbnailUrl();
    }

    /** HD-tegenhanger van {@link #resolveThumbnailUrl}. */
    String resolveHdThumbnailUrl(WikiDataRepository.WikiCardData card) {
        if (card == null) return null;
        if (card.getThumbnailHdPath() != null && !card.getThumbnailHdPath().isBlank()) {
            return hdThumbnailUrlBuilder.urlFor(card.getThumbnailHdPath());
        }
        return null;
    }

    static String truncateAtWord(String text) {
        if (text == null || text.length() <= SHORT_SUMMARY_LENGTH) {
            return text;
        }
        int lastSpace = text.lastIndexOf(' ', SHORT_SUMMARY_LENGTH);
        return text.substring(0, lastSpace > 0 ? lastSpace : SHORT_SUMMARY_LENGTH) + "…";
    }

    public ToneDetailDto getDetail(Long id, String lang) {
        Tone tone = toneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tone " + id + " not found"));

        ToneDto toneDto = ToneDto.from(tone, null, null, null, null, null,
                pickLang(tone.getOneLinerNl(), tone.getOneLinerEn(), lang));
        WikiDataDto wikiDto = tone.getWikiData() != null
                ? WikiDataDto.from(tone.getWikiData(), thumbnailUrlBuilder, hdThumbnailUrlBuilder)
                : null;
        List<AudioSampleDto> samples = tone.getAudioSamples().stream().map(AudioSampleDto::from).toList();

        return new ToneDetailDto(
                toneDto,
                wikiDto,
                samples,
                pickLang(tone.getOneLinerNl(), tone.getOneLinerEn(), lang),
                loadBackground(tone.getWikipediaPageTitle(), lang),
                relatedTones(tone)
        );
    }

    /** Achtergrond per instrument, taal-geselecteerd; null als er (nog) geen gecureerde tekst is. */
    private InstrumentBackgroundDto loadBackground(String pageTitle, String lang) {
        if (pageTitle == null) {
            return null;
        }
        InstrumentBackground bg = backgroundRepository.findByPageTitle(pageTitle).orElse(null);
        if (bg == null) {
            return null;
        }
        return new InstrumentBackgroundDto(
                pageTitle,
                pickLang(bg.getSummaryNl(), bg.getSummaryEn(), lang),
                parseFacts(bg.getFactsJson(), lang));
    }

    private List<FactDto> parseFacts(String factsJson, String lang) {
        if (factsJson == null || factsJson.isBlank()) {
            return List.of();
        }
        try {
            List<InstrumentBackgroundSeedFile.Fact> raw =
                    objectMapper.readValue(factsJson, new TypeReference<>() {
                    });
            return raw.stream()
                    .map(f -> new FactDto(f.category(), pickLang(f.nl(), f.en(), lang)))
                    .toList();
        } catch (IOException ex) {
            return List.of();
        }
    }

    /** Andere klanken die hetzelfde Wikipedia-artikel (instrument) delen, exclusief de tone zelf. */
    private List<RelatedToneDto> relatedTones(Tone tone) {
        if (tone.getWikipediaPageTitle() == null) {
            return List.of();
        }
        return toneRepository.findByWikipediaPageTitleWithCategory(tone.getWikipediaPageTitle()).stream()
                .filter(t -> !t.getId().equals(tone.getId()))
                .limit(12)
                .map(RelatedToneDto::from)
                .toList();
    }

    /** Kiest NL of EN; valt terug op de andere taal als de gevraagde leeg is. */
    private static String pickLang(String nl, String en, String lang) {
        if ("en".equalsIgnoreCase(lang)) {
            return (en != null && !en.isBlank()) ? en : nl;
        }
        return (nl != null && !nl.isBlank()) ? nl : en;
    }

    public List<ToneCategoryDto> getCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(c -> ToneCategoryDto.from(c, toneRepository.countByCategoryId(c.getId())))
                .toList();
    }

    public List<String> getSubCategories() {
        return toneRepository.findDistinctSubCategories();
    }

    @Transactional
    public ToneDto overrideWikipediaTitle(Long toneId, String pageTitle) {
        Tone tone = toneRepository.findById(toneId)
                .orElseThrow(() -> new NotFoundException("Tone " + toneId + " not found"));
        tone.setWikipediaPageTitle(normalizeKeepCase(pageTitle));
        if (tone.getWikiData() != null) {
            // Existing cached wiki content no longer matches the new title
            tone.setWikiData(null);
        }
        return ToneDto.from(tone);
    }

    private static String normalize(String value) {
        return (value == null || value.isBlank()) ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeKeepCase(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
