package com.rolandapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Vertaalt een relatief thumbnail-pad (zoals opgeslagen in
 * {@code wiki_data.thumbnail_path}) naar een server-relative URL die de
 * frontend zelf aan zijn eigen API-basis plakt. De frontend kent de
 * API-host al (zie {@code lib/api.ts}), dus een absolute URL zou alleen
 * maar problemen veroorzaken in productie (verkeerde host, CORS, …).
 */
@Component
public class ThumbnailUrlBuilder {

    private final String urlPrefix;

    public ThumbnailUrlBuilder(@Value("${app.thumbnails.url-prefix:/api/wiki-thumbs/}") String urlPrefix) {
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
