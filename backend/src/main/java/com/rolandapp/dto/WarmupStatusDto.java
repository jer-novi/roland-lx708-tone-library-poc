package com.rolandapp.dto;

/**
 * Voortgang van de wiki-warmup (achtergrondvulling van samenvattingen +
 * thumbnails). De frontend pollt dit terwijl {@code complete} false is om een
 * laad-indicator te tonen en de tone-lijst te verversen zodra er nieuwe
 * thumbnails klaarstaan.
 *
 * @param total     totaal aantal tones
 * @param withData  tones met een wiki_data-rij (= door de warmup verwerkt)
 * @param remaining tones die nog op verwerking wachten
 * @param complete  true zodra er niets meer te verwerken is
 */
public record WarmupStatusDto(long total, long withData, long remaining, boolean complete) {
}
