package com.rolandapp.dto;

import com.rolandapp.model.Tone;

/** Verwante klank (zelfde instrument/Wikipedia-artikel) voor de "Verwante klanken"-slide. */
public record RelatedToneDto(Long id, int toneNumber, String name, String category) {

    public static RelatedToneDto from(Tone tone) {
        return new RelatedToneDto(tone.getId(), tone.getToneNumber(), tone.getName(),
                tone.getCategory().getName());
    }
}
