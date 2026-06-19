-- "Bekijk op MIMO" link in de detail-modal: opslaan van de mimo detail-URL
-- naast de wiki-data. Null als er geen MIMO-match is voor deze wiki-titel.
ALTER TABLE wiki_data
    ADD COLUMN mimo_url VARCHAR(512);
