package com.rolandapp.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tones", uniqueConstraints = @UniqueConstraint(
        name = "uq_tone_category_number", columnNames = {"category_id", "tone_number"}))
public class Tone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tone_number", nullable = false)
    private int toneNumber;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sub_category", length = 50)
    private String subCategory;

    @Column(length = 100)
    private String origin;

    @Column(name = "wikipedia_page_title", length = 255)
    private String wikipediaPageTitle;

    @Column(name = "combination_suggestions", columnDefinition = "TEXT")
    private String combinationSuggestions;

    @Column(name = "fun_facts", columnDefinition = "TEXT")
    private String funFacts;

    @Column(name = "midi_bank_msb")
    private Integer midiBankMsb;

    @Column(name = "midi_bank_lsb")
    private Integer midiBankLsb;

    /** Program number 1-128, zoals genoteerd in de MIDI Implementation (zender stuurt waarde - 1). */
    @Column(name = "midi_program")
    private Integer midiProgram;

    /** Nederlandse klank-tags (timbre + context), comma-separated. */
    @Column(length = 512)
    private String tags;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ToneCategory category;

    @OneToOne(mappedBy = "tone", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private WikiData wikiData;

    @OneToMany(mappedBy = "tone", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AudioSample> audioSamples = new ArrayList<>();

    protected Tone() {
    }

    public Tone(int toneNumber, String name, ToneCategory category) {
        this.toneNumber = toneNumber;
        this.name = name;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public int getToneNumber() {
        return toneNumber;
    }

    public void setToneNumber(int toneNumber) {
        this.toneNumber = toneNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSubCategory() {
        return subCategory;
    }

    public void setSubCategory(String subCategory) {
        this.subCategory = subCategory;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getWikipediaPageTitle() {
        return wikipediaPageTitle;
    }

    public void setWikipediaPageTitle(String wikipediaPageTitle) {
        this.wikipediaPageTitle = wikipediaPageTitle;
    }

    public String getCombinationSuggestions() {
        return combinationSuggestions;
    }

    public void setCombinationSuggestions(String combinationSuggestions) {
        this.combinationSuggestions = combinationSuggestions;
    }

    public String getFunFacts() {
        return funFacts;
    }

    public void setFunFacts(String funFacts) {
        this.funFacts = funFacts;
    }

    public Integer getMidiBankMsb() {
        return midiBankMsb;
    }

    public void setMidiBankMsb(Integer midiBankMsb) {
        this.midiBankMsb = midiBankMsb;
    }

    public Integer getMidiBankLsb() {
        return midiBankLsb;
    }

    public void setMidiBankLsb(Integer midiBankLsb) {
        this.midiBankLsb = midiBankLsb;
    }

    public Integer getMidiProgram() {
        return midiProgram;
    }

    public void setMidiProgram(Integer midiProgram) {
        this.midiProgram = midiProgram;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public ToneCategory getCategory() {
        return category;
    }

    public void setCategory(ToneCategory category) {
        this.category = category;
    }

    public WikiData getWikiData() {
        return wikiData;
    }

    public void setWikiData(WikiData wikiData) {
        this.wikiData = wikiData;
    }

    public List<AudioSample> getAudioSamples() {
        return audioSamples;
    }
}
