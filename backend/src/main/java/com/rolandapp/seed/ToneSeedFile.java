package com.rolandapp.seed;

import java.util.List;

/** Mirrors the structure of data/tones_seed.json. */
public record ToneSeedFile(List<CategorySeed> categories, List<ToneSeed> tones) {

    public record CategorySeed(String name, int displayOrder, String description) {
    }

    public record ToneSeed(
            int toneNumber,
            String name,
            String category,
            String subCategory,
            String origin,
            String wikipediaPageTitle,
            String funFacts,
            String combinationSuggestions,
            Integer midiBankMsb,
            Integer midiBankLsb,
            Integer midiProgram,
            String tags,
            String oneLinerNl,
            String oneLinerEn
    ) {
    }
}
