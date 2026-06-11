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

    /** Relatief pad onder de thumbnail storage directory (zie {@code app.thumbnails.storage-dir}). */
    @Column(name = "thumbnail_path", length = 512)
    private String thumbnailPath;

    /** Originele breedte in pixels (van de Wikimedia response). Null voor oudere rijen. */
    @Column(name = "thumbnail_width")
    private Integer thumbnailWidth;

    /** Originele hoogte in pixels. */
    @Column(name = "thumbnail_height")
    private Integer thumbnailHeight;

    /** HD-variant: relatief pad onder de HD-storage directory. Null als niet
     *  opgeslagen of niet beschikbaar via een HD-bron. */
    @Column(name = "thumbnail_hd_path", length = 512)
    private String thumbnailHdPath;

    /** Originele breedte van de HD-image (typisch 1600+). */
    @Column(name = "thumbnail_hd_width")
    private Integer thumbnailHdWidth;

    /** Originele hoogte van de HD-image. */
    @Column(name = "thumbnail_hd_height")
    private Integer thumbnailHdHeight;

    /** Welke bron de HD-image heeft opgeleverd, bv. {@code mimo}, {@code local-hd}, {@code wiki-hd}. */
    @Column(name = "thumbnail_hd_source", length = 32)
    private String thumbnailHdSource;

    /** Optionele MIMO detail-URL (mimo-international.com/MIMO/doc/...).
     *  Null als er geen MIMO-match is voor de wiki-titel van deze tone.
     *  Gebruikt door de frontend "Bekijk op MIMO"-knop. */
    @Column(name = "mimo_url", length = 512)
    private String mimoUrl;

    /**
     * Welke "source" de thumbnail heeft opgeleverd. Bijv. {@code wiki-summary},
     * {@code wiki-pageimages}, of straks {@code flickr}, {@code cms-strapi},
     * {@code ai-generated}, {@code static-fallback}.
     */
    @Column(name = "thumbnail_source", length = 32)
    private String thumbnailSource;

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

    public String getThumbnailPath() {
        return thumbnailPath;
    }

    public void setThumbnailPath(String thumbnailPath) {
        this.thumbnailPath = thumbnailPath;
    }

    public Integer getThumbnailWidth() {
        return thumbnailWidth;
    }

    public void setThumbnailWidth(Integer thumbnailWidth) {
        this.thumbnailWidth = thumbnailWidth;
    }

    public Integer getThumbnailHeight() {
        return thumbnailHeight;
    }

    public void setThumbnailHeight(Integer thumbnailHeight) {
        this.thumbnailHeight = thumbnailHeight;
    }

    public String getThumbnailSource() {
        return thumbnailSource;
    }

    public void setThumbnailSource(String thumbnailSource) {
        this.thumbnailSource = thumbnailSource;
    }

    public String getThumbnailHdPath() {
        return thumbnailHdPath;
    }

    public void setThumbnailHdPath(String thumbnailHdPath) {
        this.thumbnailHdPath = thumbnailHdPath;
    }

    public Integer getThumbnailHdWidth() {
        return thumbnailHdWidth;
    }

    public void setThumbnailHdWidth(Integer thumbnailHdWidth) {
        this.thumbnailHdWidth = thumbnailHdWidth;
    }

    public Integer getThumbnailHdHeight() {
        return thumbnailHdHeight;
    }

    public void setThumbnailHdHeight(Integer thumbnailHdHeight) {
        this.thumbnailHdHeight = thumbnailHdHeight;
    }

    public String getThumbnailHdSource() {
        return thumbnailHdSource;
    }

    public void setThumbnailHdSource(String thumbnailHdSource) {
        this.thumbnailHdSource = thumbnailHdSource;
    }

    public String getMimoUrl() {
        return mimoUrl;
    }

    public void setMimoUrl(String mimoUrl) {
        this.mimoUrl = mimoUrl;
    }

    public Instant getLastFetchedAt() {
        return lastFetchedAt;
    }

    public void setLastFetchedAt(Instant lastFetchedAt) {
        this.lastFetchedAt = lastFetchedAt;
    }
}
