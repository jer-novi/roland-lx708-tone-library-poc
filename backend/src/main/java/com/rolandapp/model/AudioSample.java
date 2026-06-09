package com.rolandapp.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "audio_samples")
public class AudioSample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tone_id", nullable = false)
    private Tone tone;

    @Column(length = 10)
    private String pitch;

    @Column(name = "file_url", nullable = false, length = 512)
    private String fileUrl;

    @Column(length = 255)
    private String description;

    @Column(length = 50)
    private String source;

    @Column(name = "is_performance", nullable = false)
    private boolean isPerformance;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected AudioSample() {
    }

    public AudioSample(Tone tone, String pitch, String fileUrl, String description, boolean isPerformance) {
        this.tone = tone;
        this.pitch = pitch;
        this.fileUrl = fileUrl;
        this.description = description;
        this.isPerformance = isPerformance;
    }

    public Long getId() {
        return id;
    }

    public Tone getTone() {
        return tone;
    }

    public String getPitch() {
        return pitch;
    }

    public void setPitch(String pitch) {
        this.pitch = pitch;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public boolean isPerformance() {
        return isPerformance;
    }

    public void setPerformance(boolean performance) {
        isPerformance = performance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
