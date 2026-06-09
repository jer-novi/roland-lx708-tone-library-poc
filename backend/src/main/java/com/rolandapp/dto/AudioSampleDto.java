package com.rolandapp.dto;

import com.rolandapp.model.AudioSample;

import java.time.Instant;

public record AudioSampleDto(
        Long id,
        String pitch,
        String fileUrl,
        String description,
        String source,
        boolean isPerformance,
        Instant createdAt
) {
    public static AudioSampleDto from(AudioSample sample) {
        return new AudioSampleDto(
                sample.getId(),
                sample.getPitch(),
                sample.getFileUrl(),
                sample.getDescription(),
                sample.getSource(),
                sample.isPerformance(),
                sample.getCreatedAt()
        );
    }
}
