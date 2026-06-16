package com.rolandapp.seed;

import java.util.List;
import java.util.Map;

/**
 * Mirrors data/instrument_backgrounds.json. Top-level {@code _meta} wordt
 * genegeerd (onbekend veld). De {@link Fact}-vorm wordt zowel bij het seeden
 * (serialiseren naar {@code facts_json}) als bij het lezen hergebruikt.
 */
public record InstrumentBackgroundSeedFile(Map<String, Entry> instruments) {

    public record Entry(Localized summary, List<Fact> facts) {
    }

    public record Localized(String nl, String en) {
    }

    public record Fact(String category, String nl, String en) {
    }
}
