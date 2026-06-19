package com.rolandapp.service.thumbnail;

import com.rolandapp.model.Tone;

import java.util.Optional;

/**
 * Eén "bron" om een thumbnail voor een tone op te zoeken (Wikipedia,
 * Flickr, Strapi CMS, AI-gegenereerd, statische fallback, ...).
 *
 * <p>Het contract is bewust klein: implementeer {@link #lookup(Tone)} en
 * geef een {@link Candidate} terug met de externe URL, de gewenste
 * download-breedte en een tag die in de database komt
 * ({@code wiki-summary}, {@code flickr}, ...). De download zelf, de
 * opslag, en het pad-terug-naar-de-DTO gebeuren in
 * {@code ThumbnailResolver}/{@code ThumbnailStorage}, zodat elke bron
 * zich geen zorgen hoeft te maken over cache-keys of files.
 *
 * <p>De {@link ThumbnailResolver} gebruikt de SD-ladder
 * ({@code order()} 3-20). De {@link HdThumbnailResolver} gebruikt alleen
 * bronnen waar {@link #hdOnly()} true is (hogere resolutie van dezelfde
 * bron, bv. Wikipedia-1600px of een MIMO museum-foto).
 */
public interface ThumbnailSource {

    /**
     * Volgorde waarin deze bron wordt geprobeerd (lager = eerder).
     * De resolver doorloopt de ladder op deze volgorde.
     */
    int order();

    /**
     * @return Een {@link Candidate} met de externe URL die
     *         {@code ThumbnailStorage} kan downloaden, of leeg als deze
     *         bron geen geschikte afbeelding kan vinden.
     */
    Optional<Candidate> lookup(Tone tone);

    /**
     * Of deze bron een HD-variant aanbiedt. De HD-resolver loopt alleen
     * over bronnen die hier true teruggeven, in dezelfde {@link #order()}
     * volgorde. Default: false.
     */
    default boolean hdOnly() {
        return false;
    }

    /** Resultaat van een geslaagde lookup. */
    record Candidate(String externalUrl, String sourceTag, int desiredWidth, int desiredHeight) {
        public Candidate(String externalUrl, String sourceTag, int desiredWidth) {
            this(externalUrl, sourceTag, desiredWidth, 0);
        }
    }
}
