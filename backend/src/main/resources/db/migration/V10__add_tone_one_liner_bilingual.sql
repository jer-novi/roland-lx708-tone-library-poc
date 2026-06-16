-- Pakkende one-liner per tone, tweetalig (NL + EN). Slide 1 van de kaart-carousel.
-- Platte kolommen i.p.v. een i18n-tabel: consistent met fun_facts/tags en simpel voor
-- 324 rijen + 2 talen. Bij een 3e taal migreren we naar een aparte tone_text-tabel.
ALTER TABLE tones ADD COLUMN one_liner_nl TEXT;
ALTER TABLE tones ADD COLUMN one_liner_en TEXT;
