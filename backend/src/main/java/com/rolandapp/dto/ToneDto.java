package com.rolandapp.dto;

import com.rolandapp.model.Tone;

public record ToneDto(
        Long id,
        int toneNumber,
        String name,
        String category,
        String subCategory,
        String origin,
        String wikipediaPageTitle,
        String combinationSuggestions,
        String funFacts,
        String thumbnailUrl,
        Integer thumbnailWidth,
        Integer thumbnailHeight,
        String shortSummary,
        Integer midiBankMsb,
        Integer midiBankLsb,
        Integer midiProgram,
        String tags
) {
    public static ToneDto from(Tone tone) {
        return from(tone, null, null, null, null);
    }

    public static ToneDto from(Tone tone, String thumbnailUrl, String shortSummary) {
        return from(tone, thumbnailUrl, null, null, shortSummary);
    }

    public static ToneDto from(Tone tone, String thumbnailUrl, Integer thumbnailWidth, Integer thumbnailHeight, String shortSummary) {
        return new ToneDto(
                tone.getId(),
                tone.getToneNumber(),
                tone.getName(),
                tone.getCategory().getName(),
                tone.getSubCategory(),
                tone.getOrigin(),
                tone.getWikipediaPageTitle(),
                tone.getCombinationSuggestions(),
                tone.getFunFacts(),
                thumbnailUrl,
                thumbnailWidth,
                thumbnailHeight,
                shortSummary,
                tone.getMidiBankMsb(),
                tone.getMidiBankLsb(),
                tone.getMidiProgram(),
                tone.getTags()
        );
    }
}
