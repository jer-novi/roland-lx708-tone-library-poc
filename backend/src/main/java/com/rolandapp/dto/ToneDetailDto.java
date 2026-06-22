package com.rolandapp.dto;

import java.util.List;

/**
 * Detail-payload voor de kaart-carousel. Naast de bestaande tone/wiki/audio-velden:
 * de taal-geselecteerde {@code oneLiner}, de {@code background} (samenvatting + facts
 * per instrument) en {@code relatedTones} (andere klanken van hetzelfde instrument).
 * Wordt samengesteld in {@code ToneService.getDetail}.
 */
public record ToneDetailDto(
        ToneDto tone,
        WikiDataDto wikiData,
        List<AudioSampleDto> audioSamples,
        String oneLiner,
        InstrumentBackgroundDto background,
        List<RelatedToneDto> relatedTones
) {
}
