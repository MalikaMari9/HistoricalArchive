package com.example.demo.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.demo.entity.Artifact;



public interface ArtifactService {
    
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
        String sortBy,
        Pageable pageable
    );
    
    Page<Artifact> globalSearch(String search, Pageable pageable);
    
    // Add methods for distinct values
    List<String> getDistinctCategories();
    List<String> getDistinctCultures();
    List<String> getDistinctDepartments();
    List<String> getDistinctPeriods();
    
    
}