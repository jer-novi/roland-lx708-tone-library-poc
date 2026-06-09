package com.rolandapp.repository;

import com.rolandapp.model.WikiData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WikiDataRepository extends JpaRepository<WikiData, Long> {

    Optional<WikiData> findByToneId(Long toneId);
}
