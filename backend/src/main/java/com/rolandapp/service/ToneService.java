package com.rolandapp.service;

import com.rolandapp.dto.ToneCategoryDto;
import com.rolandapp.dto.ToneDetailDto;
import com.rolandapp.dto.ToneDto;
import com.rolandapp.exception.NotFoundException;
import com.rolandapp.model.Tone;
import com.rolandapp.repository.ToneCategoryRepository;
import com.rolandapp.repository.ToneRepository;
import com.rolandapp.repository.WikiDataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public ToneService(ToneRepository toneRepository,
                       ToneCategoryRepository categoryRepository,
                       WikiDataRepository wikiDataRepository) {
        this.toneRepository = toneRepository;
        this.categoryRepository = categoryRepository;
        this.wikiDataRepository = wikiDataRepository;
    }

    /**
     * The full catalogue is only ~324 rows, so filtering in memory is simpler
     * and faster than dynamic SQL.
     */
    public List<ToneDto> search(String category, String subCategory, String query) {
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
                    return ToneDto.from(t,
                            card != null ? card.getThumbnailUrl() : null,
                            card != null ? truncateAtWord(card.getSummary()) : null);
                })
                .toList();
    }

    static String truncateAtWord(String text) {
        if (text == null || text.length() <= SHORT_SUMMARY_LENGTH) {
            return text;
        }
        int lastSpace = text.lastIndexOf(' ', SHORT_SUMMARY_LENGTH);
        return text.substring(0, lastSpace > 0 ? lastSpace : SHORT_SUMMARY_LENGTH) + "…";
    }

    public ToneDetailDto getDetail(Long id) {
        Tone tone = toneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tone " + id + " not found"));
        return ToneDetailDto.from(tone);
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
