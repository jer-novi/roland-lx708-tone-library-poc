package com.rolandapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Vertaalt een relatief HD-thumbnail-pad naar een server-relative URL
 * die de frontend zelf aan zijn API-basis plakt. Tegenpool van
 * {@link ThumbnailUrlBuilder} — andere prefix, andere storage.
 */
@Component
public class HdThumbnailUrlBuilder {

    private final String urlPrefix;

    public HdThumbnailUrlBuilder(@Value("${app.thumbnails.hd-url-prefix:/api/wiki-thumbs-hd/}") String urlPrefix) {
        this.urlPrefix = urlPrefix.endsWith("/") ? urlPrefix : urlPrefix + "/";
    }

    public String urlFor(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        String trimmed = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        return urlPrefix + trimmed;
    }
}
