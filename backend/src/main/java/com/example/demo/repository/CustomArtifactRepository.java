package com.example.demo.repository;

import com.example.demo.entity.Artifact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

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
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable
    );
    
    Page<Artifact> globalSearch(String search, Pageable pageable);

}
