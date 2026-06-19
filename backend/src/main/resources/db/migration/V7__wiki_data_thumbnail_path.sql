-- Thumbnail storage: store images locally on disk instead of hot-linking
-- the Wikipedia CDN. A new `thumbnail_path` column carries the relative path
-- under the configured thumbnail storage directory (see
-- app.thumbnails.storage-dir in application.yml). The old `thumbnail_url`
-- column is left in place for now and will be removed in a follow-up
-- migration once all tones have been re-fetched through the new pipeline.
ALTER TABLE wiki_data
    ADD COLUMN thumbnail_path     VARCHAR(512),
    ADD COLUMN thumbnail_width    INTEGER,
    ADD COLUMN thumbnail_height   INTEGER,
    ADD COLUMN thumbnail_source   VARCHAR(32);
