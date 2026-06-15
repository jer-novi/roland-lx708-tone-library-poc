package com.rolandapp.dto;

import com.rolandapp.model.WikiData;
import com.rolandapp.service.HdThumbnailUrlBuilder;
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
        String thumbnailHdUrl,
        Integer thumbnailHdWidth,
        Integer thumbnailHdHeight,
        String thumbnailHdSource,
        String mimoUrl,
        Instant lastFetchedAt
) {
    public static WikiDataDto from(WikiData wikiData, ThumbnailUrlBuilder sdBuilder, HdThumbnailUrlBuilder hdBuilder) {
        String thumbUrl;
        if (wikiData.getThumbnailPath() != null && !wikiData.getThumbnailPath().isBlank()) {
            thumbUrl = sdBuilder.urlFor(wikiData.getThumbnailPath());
        } else {
            thumbUrl = wikiData.getThumbnailUrl();
        }
        String hdUrl = null;
        if (wikiData.getThumbnailHdPath() != null && !wikiData.getThumbnailHdPath().isBlank()) {
            hdUrl = hdBuilder.urlFor(wikiData.getThumbnailHdPath());
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
                hdUrl,
                wikiData.getThumbnailHdWidth(),
                wikiData.getThumbnailHdHeight(),
                wikiData.getThumbnailHdSource(),
                wikiData.getMimoUrl(),
                wikiData.getLastFetchedAt()
        );
    }
}
