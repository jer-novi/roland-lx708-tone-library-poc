-- Nederlandse klank-tags (timbre + context) per tone, comma-separated.
-- Een join-tabel is overkill voor 324 rijen en dit leespatroon (zie
-- docs/Frontend_UX_Plan_Fase2.md, sectie 3).
ALTER TABLE tones ADD COLUMN tags VARCHAR(512);
