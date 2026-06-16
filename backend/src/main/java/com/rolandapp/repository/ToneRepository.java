package com.rolandapp.repository;

import com.rolandapp.model.Tone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ToneRepository extends JpaRepository<Tone, Long> {

    Optional<Tone> findByCategoryNameAndToneNumber(String categoryName, int toneNumber);

    @Query("SELECT t FROM Tone t JOIN FETCH t.category c ORDER BY c.displayOrder, t.toneNumber")
    List<Tone> findAllWithCategory();

    /** Eager-loaded fetch van één tone incl. category (voor endpoints
     *  die buiten een @Transactional context de category-naam nodig
     *  hebben, bv. /api/tones/{id}/hs-path). */
    @Query("SELECT t FROM Tone t JOIN FETCH t.category WHERE t.id = :id")
    Optional<Tone> findByIdWithCategory(Long id);

    /** Tonen die hetzelfde Wikipedia-artikel (instrument) delen — voor de "Verwante klanken"-slide. */
    @Query("SELECT t FROM Tone t JOIN FETCH t.category WHERE t.wikipediaPageTitle = :pageTitle ORDER BY t.id")
    List<Tone> findByWikipediaPageTitleWithCategory(String pageTitle);

    long countByCategoryId(Long categoryId);

    @Query("SELECT DISTINCT t.subCategory FROM Tone t WHERE t.subCategory IS NOT NULL ORDER BY t.subCategory")
    List<String> findDistinctSubCategories();
}
