package com.example.demo.service;

import com.example.demo.entity.Artifact;
import com.example.demo.repository.ArtifactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ArtifactServiceImpl implements ArtifactService {

    private final ArtifactRepository artifactRepository;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public ArtifactServiceImpl(ArtifactRepository artifactRepository, MongoTemplate mongoTemplate) {
        this.artifactRepository = artifactRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<Artifact> searchArtifacts(String anyField, String title, String category, String culture,
                                          String department, String period, String medium, String artistName,
                                          LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        return artifactRepository.searchArtifacts(
            anyField, title, category, culture, department, period, medium, artistName, fromDate, toDate, pageable
        );
    }
    
    @Override
    public Page<Artifact> globalSearch(String search, Pageable pageable) {
        return artifactRepository.globalSearch(search, pageable);
    }

    // Add methods for fetching distinct values using MongoTemplate
    public List<String> getDistinctCategories() {
        return mongoTemplate.findDistinct(new Query(), "category", Artifact.class, String.class)
                .stream()
                .filter(category -> category != null && !category.trim().isEmpty())
                .sorted()
                .toList();
    }

    public List<String> getDistinctCultures() {
        return mongoTemplate.findDistinct(new Query(), "culture", Artifact.class, String.class)
                .stream()
                .filter(culture -> culture != null && !culture.trim().isEmpty())
                .sorted()
                .toList();
    }

    public List<String> getDistinctDepartments() {
        return mongoTemplate.findDistinct(new Query(), "department", Artifact.class, String.class)
                .stream()
                .filter(department -> department != null && !department.trim().isEmpty())
                .sorted()
                .toList();
    }

    public List<String> getDistinctPeriods() {
        return mongoTemplate.findDistinct(new Query(), "period", Artifact.class, String.class)
                .stream()
                .filter(period -> period != null && !period.trim().isEmpty())
                .sorted()
                .toList();
    }
}