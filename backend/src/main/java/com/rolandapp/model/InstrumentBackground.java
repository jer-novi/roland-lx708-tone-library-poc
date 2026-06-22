package com.rolandapp.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Gecureerde achtergrond per instrument, gekoppeld op {@code page_title}
 * (= {@link Tone#getWikipediaPageTitle()}). Meerdere tonen die hetzelfde
 * Wikipedia-artikel delen, delen dus deze achtergrond; de pakkende one-liner
 * op de tone zelf geeft elke klank z'n eigen karakter.
 */
@Entity
@Table(name = "instrument_background")
public class InstrumentBackground {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_title", nullable = false, unique = true, length = 255)
    private String pageTitle;

    @Column(name = "wikidata_qid", length = 32)
    private String wikidataQid;

    @Column(name = "summary_nl", columnDefinition = "TEXT")
    private String summaryNl;

    @Column(name = "summary_en", columnDefinition = "TEXT")
    private String summaryEn;

    /** Geordende fact-lijst als JSON: {@code [{"category","nl","en"}]}. */
    @Column(name = "facts_json", columnDefinition = "TEXT")
    private String factsJson;

    @Column(name = "last_generated_at")
    private Instant lastGeneratedAt;

    protected InstrumentBackground() {
    }

    public InstrumentBackground(String pageTitle) {
        this.pageTitle = pageTitle;
    }

    public Long getId() {
        return id;
    }

    public String getPageTitle() {
        return pageTitle;
    }

    public void setPageTitle(String pageTitle) {
        this.pageTitle = pageTitle;
    }

    public String getWikidataQid() {
        return wikidataQid;
    }

    public void setWikidataQid(String wikidataQid) {
        this.wikidataQid = wikidataQid;
    }

    public String getSummaryNl() {
        return summaryNl;
    }

    public void setSummaryNl(String summaryNl) {
        this.summaryNl = summaryNl;
    }

    public String getSummaryEn() {
        return summaryEn;
    }

    public void setSummaryEn(String summaryEn) {
        this.summaryEn = summaryEn;
    }

    public String getFactsJson() {
        return factsJson;
    }

    public void setFactsJson(String factsJson) {
        this.factsJson = factsJson;
    }

    public Instant getLastGeneratedAt() {
        return lastGeneratedAt;
    }

    public void setLastGeneratedAt(Instant lastGeneratedAt) {
        this.lastGeneratedAt = lastGeneratedAt;
    }
}
