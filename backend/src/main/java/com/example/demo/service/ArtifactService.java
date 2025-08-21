package com.example.demo.service;

import com.example.demo.entity.Artifact;
import com.example.demo.repository.ArtifactRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.LocalDate;
import java.util.List;



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
        LocalDate fromDate,
        LocalDate toDate,
        Pageable pageable
    );
    
    Page<Artifact> globalSearch(String search, Pageable pageable);
    
    // Add methods for distinct values
    List<String> getDistinctCategories();
    List<String> getDistinctCultures();
    List<String> getDistinctDepartments();
    List<String> getDistinctPeriods();
    
    
}