package com.rolandapp.repository;

import com.rolandapp.model.InstrumentBackground;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstrumentBackgroundRepository extends JpaRepository<InstrumentBackground, Long> {

    Optional<InstrumentBackground> findByPageTitle(String pageTitle);
}
