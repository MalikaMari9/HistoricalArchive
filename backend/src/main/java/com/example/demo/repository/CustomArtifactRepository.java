package com.example.demo.repository;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.demo.entity.Artifact;

public interface CustomArtifactRepository {
    Page<Artifact> searchArtifacts(
            String anyField,
            String title,
            String category,
            String culture,
            String department,
            String period,
            String medium,
            String artistName,
            String tags,
            LocalDate fromDate,
            LocalDate toDate,
            String locationQuery,
            Double latitude,
            Double longitude,
            Double radius,
            String city,
            String country,
            Pageable pageable
    );
    
    Page<Artifact> globalSearch(String search, Pageable pageable);

}
