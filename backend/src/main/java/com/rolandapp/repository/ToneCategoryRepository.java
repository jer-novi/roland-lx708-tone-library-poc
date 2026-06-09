package com.rolandapp.repository;

import com.rolandapp.model.ToneCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ToneCategoryRepository extends JpaRepository<ToneCategory, Long> {

    Optional<ToneCategory> findByNameIgnoreCase(String name);

    List<ToneCategory> findAllByOrderByDisplayOrderAsc();
}
