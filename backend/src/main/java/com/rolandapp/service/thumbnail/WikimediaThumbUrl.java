package com.rolandapp.service.thumbnail;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bouwt een Wikimedia thumb-URL met een specifieke breedte uit een
 * originele upload-URL of een bestaande thumb-URL.
 *
 * <p>Wikimedia's thumb-server accepteert alleen nog de vaste lijst
 * breedtes van https://www.mediawiki.org/wiki/Common_thumbnail_sizes
 * (via https://w.wiki/GHai): 20/40/60/120/250/330/500/960/1280/1920/3840.
 * Andere waarden geven HTTP 400 — behálve wanneer die maat toevallig nog
 * uit het pre-whitelist tijdperk gecached is, wat misleidend "soms werkt"
 * oplevert (zo leek 800px te werken op oude populaire bestanden).
 * Gebruik dus uitsluitend breedtes uit {@link #ALLOWED_WIDTHS}.
 *
 * <p>URL-vormen:
 * <ul>
 *   <li>original: {@code .../wikipedia/commons/0/01/File.jpg}</li>
 *   <li>thumb:    {@code .../wikipedia/commons/thumb/0/01/File.jpg/330px-File.jpg}</li>
 * </ul>
 */
final class WikimediaThumbUrl {

    static final Set<Integer> ALLOWED_WIDTHS = Set.of(20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840);

    /** original-URL: groep 1 = prefix t/m project, 2 = a/ab hash-pad, 3 = bestandsnaam */
    private static final Pattern ORIGINAL_PATTERN = Pattern.compile(
            "^(https?://upload\\.wikimedia\\.org/wikipedia/[^/]+)/([0-9a-f]/[0-9a-f]{2})/([^/]+)$");

    /** thumb-URL: groep 1 = alles t/m bestandsnaam, 2 = breedte, 3 = thumb-bestandsnaam */
    private static final Pattern THUMB_PATTERN = Pattern.compile(
            "^(https?://upload\\.wikimedia\\.org/wikipedia/[^/]+/thumb/[0-9a-f]/[0-9a-f]{2}/[^/]+)/(\\d+)px-([^/]+)$");

    private WikimediaThumbUrl() {
    }

    /**
     * @return de thumb-URL voor {@code width}, of {@code null} wanneer de
     *         URL niet herschreven kan worden (onbekend patroon, of een
     *         formaat waarvan de thumb-bestandsnaam afwijkt, zoals SVG
     *         dat een {@code .png}-suffix krijgt en TIFF een
     *         {@code lossy-page1-}-prefix). De caller gebruikt dan de
     *         originele URL.
     */
    static String forWidth(String url, int width) {
        if (url == null || !ALLOWED_WIDTHS.contains(width)) return null;
        Matcher thumb = THUMB_PATTERN.matcher(url);
        if (thumb.matches()) {
            if (!hasSimpleThumbName(thumb.group(3))) return null;
            return thumb.group(1) + "/" + width + "px-" + thumb.group(3);
        }
        Matcher original = ORIGINAL_PATTERN.matcher(url);
        if (original.matches()) {
            String filename = original.group(3);
            if (!hasSimpleThumbName(filename)) return null;
            return original.group(1) + "/thumb/" + original.group(2) + "/" + filename
                    + "/" + width + "px-" + filename;
        }
        return null;
    }

    /** Alleen formaten waarvan de thumb-naam exact {@code {w}px-{file}} is. */
    private static boolean hasSimpleThumbName(String filename) {
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".png") || lower.endsWith(".gif");
    }
}
