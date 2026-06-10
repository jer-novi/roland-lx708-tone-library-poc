-- MIDI bank/program mapping per tone, uit de officiële Roland LX708/LX706/LX705
-- MIDI Implementation (v1.00, aug 2021), sectie "4.Tone List".
-- midi_program is 1-128 zoals in het document; een zender stuurt (midi_program - 1).
ALTER TABLE tones ADD COLUMN midi_bank_msb SMALLINT;
ALTER TABLE tones ADD COLUMN midi_bank_lsb SMALLINT;
ALTER TABLE tones ADD COLUMN midi_program  SMALLINT;
