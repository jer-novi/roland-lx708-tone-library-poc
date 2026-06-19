package com.rolandapp.repository;

import com.rolandapp.model.WikiData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WikiDataRepository extends JpaRepository<WikiData, Long> {

    Optional<WikiData> findByToneId(Long toneId);

    /** Lightweight card data for the tone list; avoids loading full_html. */
    @Query("SELECT w.tone.id AS toneId, w.thumbnailUrl AS thumbnailUrl, " +
            "w.thumbnailPath AS thumbnailPath, w.thumbnailWidth AS thumbnailWidth, " +
            "w.thumbnailHeight AS thumbnailHeight, w.summary AS summary, " +
            "w.thumbnailHdPath AS thumbnailHdPath FROM WikiData w")
    List<WikiCardData> findAllCardData();

    interface WikiCardData {
        Long getToneId();

        String getThumbnailUrl();

        String getThumbnailPath();

        Integer getThumbnailWidth();

        Integer getThumbnailHeight();

        String getSummary();

        String getThumbnailHdPath();
    }
}
