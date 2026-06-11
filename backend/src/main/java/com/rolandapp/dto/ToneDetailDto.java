package com.rolandapp.dto;

import com.rolandapp.model.Tone;
import com.rolandapp.service.ThumbnailUrlBuilder;

import java.util.List;

public record ToneDetailDto(
        ToneDto tone,
        WikiDataDto wikiData,
        List<AudioSampleDto> audioSamples
) {
    public static ToneDetailDto from(Tone tone, ThumbnailUrlBuilder urlBuilder) {
        return new ToneDetailDto(
                ToneDto.from(tone),
                tone.getWikiData() != null ? WikiDataDto.from(tone.getWikiData(), urlBuilder) : null,
                tone.getAudioSamples().stream().map(AudioSampleDto::from).toList()
        );
    }
}
