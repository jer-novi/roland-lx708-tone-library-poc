package com.rolandapp.dto;

import com.rolandapp.model.WikiData;
import com.rolandapp.service.ThumbnailUrlBuilder;

import java.time.Instant;

public record WikiDataDto(
        String pageTitle,
        String summary,
        String fullHtml,
        String sourceUrl,
        String thumbnailUrl,
        Integer thumbnailWidth,
        Integer thumbnailHeight,
        String thumbnailSource,
        Instant lastFetchedAt
) {
    public static WikiDataDto from(WikiData wikiData, ThumbnailUrlBuilder urlBuilder) {
        String thumbUrl;
        if (wikiData.getThumbnailPath() != null && !wikiData.getThumbnailPath().isBlank()) {
            thumbUrl = urlBuilder.urlFor(wikiData.getThumbnailPath());
        } else {
            thumbUrl = wikiData.getThumbnailUrl();
        }
        return new WikiDataDto(
                wikiData.getPageTitle(),
                wikiData.getSummary(),
                wikiData.getFullHtml(),
                wikiData.getSourceUrl(),
                thumbUrl,
                wikiData.getThumbnailWidth(),
                wikiData.getThumbnailHeight(),
                wikiData.getThumbnailSource(),
                wikiData.getLastFetchedAt()
        );
    }
}
