-- Uitgebreide samenvatting + gecategoriseerde fact-blokken per INSTRUMENT
-- (gekoppeld aan tones.wikipedia_page_title; ~159 unieke instrumenten i.p.v. 324 tonen).
-- facts_json bevat de geordende fact-lijst [{category, nl, en}] — geen aparte tabel,
-- want facts worden altijd als set per instrument gelezen.
CREATE TABLE instrument_background (
    id                BIGSERIAL    PRIMARY KEY,
    page_title        VARCHAR(255) NOT NULL UNIQUE,
    wikidata_qid      VARCHAR(32),
    summary_nl        TEXT,
    summary_en        TEXT,
    facts_json        TEXT,
    last_generated_at TIMESTAMP
);
