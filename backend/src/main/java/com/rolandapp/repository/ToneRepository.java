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

    long countByCategoryId(Long categoryId);

    @Query("SELECT DISTINCT t.subCategory FROM Tone t WHERE t.subCategory IS NOT NULL ORDER BY t.subCategory")
    List<String> findDistinctSubCategories();
}
