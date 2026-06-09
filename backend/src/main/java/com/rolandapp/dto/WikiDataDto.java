package com.rolandapp.dto;

import com.rolandapp.model.WikiData;

import java.time.Instant;

public record WikiDataDto(
        String pageTitle,
        String summary,
        String fullHtml,
        String sourceUrl,
        String thumbnailUrl,
        Instant lastFetchedAt
) {
    public static WikiDataDto from(WikiData wikiData) {
        return new WikiDataDto(
                wikiData.getPageTitle(),
                wikiData.getSummary(),
                wikiData.getFullHtml(),
                wikiData.getSourceUrl(),
                wikiData.getThumbnailUrl(),
                wikiData.getLastFetchedAt()
        );
    }
}
