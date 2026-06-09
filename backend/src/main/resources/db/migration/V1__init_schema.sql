-- Roland LX708 Tone Library - initial schema

CREATE TABLE tone_categories (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL UNIQUE,
    display_order INTEGER      NOT NULL DEFAULT 0,
    description   VARCHAR(255)
);

CREATE TABLE tones (
    id                      BIGSERIAL PRIMARY KEY,
    tone_number             INTEGER      NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    sub_category            VARCHAR(50),
    origin                  VARCHAR(100),
    wikipedia_page_title    VARCHAR(255),
    combination_suggestions TEXT,
    fun_facts               TEXT,
    category_id             BIGINT       NOT NULL REFERENCES tone_categories (id),
    CONSTRAINT uq_tone_category_number UNIQUE (category_id, tone_number)
);

CREATE INDEX idx_tones_category ON tones (category_id);
CREATE INDEX idx_tones_sub_category ON tones (sub_category);
CREATE INDEX idx_tones_name ON tones (LOWER(name));

CREATE TABLE wiki_data (
    id              BIGSERIAL PRIMARY KEY,
    tone_id         BIGINT       NOT NULL UNIQUE REFERENCES tones (id) ON DELETE CASCADE,
    page_title      VARCHAR(255) NOT NULL,
    summary         TEXT,
    full_html       TEXT,
    source_url      VARCHAR(512),
    last_fetched_at TIMESTAMP
);

CREATE TABLE audio_samples (
    id             BIGSERIAL PRIMARY KEY,
    tone_id        BIGINT       NOT NULL REFERENCES tones (id) ON DELETE CASCADE,
    pitch          VARCHAR(10),
    file_url       VARCHAR(512) NOT NULL,
    description    VARCHAR(255),
    source         VARCHAR(50),
    is_performance BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audio_samples_tone ON audio_samples (tone_id);

CREATE TABLE song_categories (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(50) NOT NULL UNIQUE,
    display_order INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE songs (
    id          BIGSERIAL PRIMARY KEY,
    song_number INTEGER      NOT NULL,
    name        VARCHAR(150) NOT NULL,
    composer    VARCHAR(150),
    category_id BIGINT       NOT NULL REFERENCES song_categories (id),
    CONSTRAINT uq_song_category_number UNIQUE (category_id, song_number)
);
