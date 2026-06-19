package com.rolandapp.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rolandapp.model.Tone;
import com.rolandapp.model.ToneCategory;
import com.rolandapp.repository.ToneCategoryRepository;
import com.rolandapp.repository.ToneRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Loads data/tones_seed.json (classpath) into the database at startup.
 * The import is idempotent: existing tones are matched on (category, toneNumber)
 * and updated in place, so re-deploys never create duplicates.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
@Order(1) // vóór WikiWarmup
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private static final String SEED_RESOURCE = "data/tones_seed.json";

    private final ToneCategoryRepository categoryRepository;
    private final ToneRepository toneRepository;
    private final ObjectMapper objectMapper;

    public DataInitializer(ToneCategoryRepository categoryRepository,
                           ToneRepository toneRepository,
                           ObjectMapper objectMapper) {
        this.categoryRepository = categoryRepository;
        this.toneRepository = toneRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        ClassPathResource resource = new ClassPathResource(SEED_RESOURCE);
        if (!resource.exists()) {
            log.warn("Seed file {} not found on classpath, skipping seeding", SEED_RESOURCE);
            return;
        }

        ToneSeedFile seedFile;
        try (InputStream in = resource.getInputStream()) {
            seedFile = objectMapper.readValue(in, ToneSeedFile.class);
        }

        Map<String, ToneCategory> categories = upsertCategories(seedFile);
        int created = 0;
        int updated = 0;

        for (ToneSeedFile.ToneSeed seed : seedFile.tones()) {
            ToneCategory category = categories.get(seed.category());
            if (category == null) {
                log.warn("Tone '{}' references unknown category '{}', skipping", seed.name(), seed.category());
                continue;
            }
            Tone tone = toneRepository
                    .findByCategoryNameAndToneNumber(category.getName(), seed.toneNumber())
                    .orElse(null);
            if (tone == null) {
                tone = new Tone(seed.toneNumber(), seed.name(), category);
                applySeed(tone, seed);
                toneRepository.save(tone);
                created++;
            } else if (needsUpdate(tone, seed)) {
                applySeed(tone, seed);
                updated++;
            }
        }

        log.info("Tone seeding finished: {} created, {} updated, {} total in seed file",
                created, updated, seedFile.tones().size());
    }

    private Map<String, ToneCategory> upsertCategories(ToneSeedFile seedFile) {
        Map<String, ToneCategory> byName = new HashMap<>();
        for (ToneSeedFile.CategorySeed seed : seedFile.categories()) {
            ToneCategory category = categoryRepository.findByNameIgnoreCase(seed.name())
                    .orElseGet(() -> new ToneCategory(seed.name(), seed.displayOrder(), seed.description()));
            category.setDisplayOrder(seed.displayOrder());
            category.setDescription(seed.description());
            byName.put(seed.name(), categoryRepository.save(category));
        }
        return byName;
    }

    private boolean needsUpdate(Tone tone, ToneSeedFile.ToneSeed seed) {
        return !Objects.equals(tone.getName(), seed.name())
                || !Objects.equals(tone.getSubCategory(), seed.subCategory())
                || !Objects.equals(tone.getOrigin(), seed.origin())
                || !Objects.equals(tone.getWikipediaPageTitle(), seed.wikipediaPageTitle())
                || !Objects.equals(tone.getFunFacts(), seed.funFacts())
                || !Objects.equals(tone.getCombinationSuggestions(), seed.combinationSuggestions())
                || !Objects.equals(tone.getMidiBankMsb(), seed.midiBankMsb())
                || !Objects.equals(tone.getMidiBankLsb(), seed.midiBankLsb())
                || !Objects.equals(tone.getMidiProgram(), seed.midiProgram())
                || !Objects.equals(tone.getTags(), seed.tags());
    }

    private void applySeed(Tone tone, ToneSeedFile.ToneSeed seed) {
        tone.setName(seed.name());
        tone.setSubCategory(seed.subCategory());
        tone.setOrigin(seed.origin());
        tone.setWikipediaPageTitle(seed.wikipediaPageTitle());
        tone.setFunFacts(seed.funFacts());
        tone.setCombinationSuggestions(seed.combinationSuggestions());
        tone.setMidiBankMsb(seed.midiBankMsb());
        tone.setMidiBankLsb(seed.midiBankLsb());
        tone.setMidiProgram(seed.midiProgram());
        tone.setTags(seed.tags());
    }
}
