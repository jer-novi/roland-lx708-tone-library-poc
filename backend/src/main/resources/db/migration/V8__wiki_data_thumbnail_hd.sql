-- HD thumbnail storage: second column-set alongside the existing SD ones.
-- Populated by HdThumbnailResolver (separate storage dir, served at
-- /api/wiki-thumbs-hd/). On a fresh install the SD and HD resolutions
-- may point at the same source image (MIMO museum photo, full-res
-- by default) but over time HD can carry a 1600px+ Wikipedia version
-- when the SD one was a small icon.
ALTER TABLE wiki_data
    ADD COLUMN thumbnail_hd_path    VARCHAR(512),
    ADD COLUMN thumbnail_hd_width   INTEGER,
    ADD COLUMN thumbnail_hd_height  INTEGER,
    ADD COLUMN thumbnail_hd_source  VARCHAR(32);
