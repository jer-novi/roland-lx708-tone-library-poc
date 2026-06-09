package com.rolandapp.repository;

import com.rolandapp.model.AudioSample;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AudioSampleRepository extends JpaRepository<AudioSample, Long> {

    List<AudioSample> findByToneIdOrderByCreatedAtDesc(Long toneId);
}
