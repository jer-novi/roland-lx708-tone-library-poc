package com.rolandapp.model;

import jakarta.persistence.*;

@Entity
@Table(name = "songs", uniqueConstraints = @UniqueConstraint(
        name = "uq_song_category_number", columnNames = {"category_id", "song_number"}))
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "song_number", nullable = false)
    private int songNumber;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 150)
    private String composer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private SongCategory category;

    protected Song() {
    }

    public Song(int songNumber, String name, String composer, SongCategory category) {
        this.songNumber = songNumber;
        this.name = name;
        this.composer = composer;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public int getSongNumber() {
        return songNumber;
    }

    public String getName() {
        return name;
    }

    public String getComposer() {
        return composer;
    }

    public SongCategory getCategory() {
        return category;
    }
}
