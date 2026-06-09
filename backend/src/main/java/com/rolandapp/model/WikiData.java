package com.rolandapp.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "wiki_data")
public class WikiData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tone_id", nullable = false, unique = true)
    private Tone tone;

    @Column(name = "page_title", nullable = false, length = 255)
    private String pageTitle;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "full_html", columnDefinition = "TEXT")
    private String fullHtml;

    @Column(name = "source_url", length = 512)
    private String sourceUrl;

    @Column(name = "thumbnail_url", length = 512)
    private String thumbnailUrl;

    @Column(name = "last_fetched_at")
    private Instant lastFetchedAt;

    protected WikiData() {
    }

    public WikiData(Tone tone, String pageTitle) {
        this.tone = tone;
        this.pageTitle = pageTitle;
    }

    public Long getId() {
        return id;
    }

    public Tone getTone() {
        return tone;
    }

    public String getPageTitle() {
        return pageTitle;
    }

    public void setPageTitle(String pageTitle) {
        this.pageTitle = pageTitle;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getFullHtml() {
        return fullHtml;
    }

    public void setFullHtml(String fullHtml) {
        this.fullHtml = fullHtml;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public Instant getLastFetchedAt() {
        return lastFetchedAt;
    }

    public void setLastFetchedAt(Instant lastFetchedAt) {
        this.lastFetchedAt = lastFetchedAt;
    }
}
