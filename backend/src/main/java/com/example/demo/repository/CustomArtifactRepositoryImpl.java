package com.example.demo.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.UserArtifact;

public class CustomArtifactRepositoryImpl implements CustomArtifactRepository {

    private final MongoTemplate mongoTemplate;
    private final UserArtifactRepository userArtifactRepository;
    private final RatingRepository ratingRepository;

    public CustomArtifactRepositoryImpl(MongoTemplate mongoTemplate, UserArtifactRepository userArtifactRepository, RatingRepository ratingRepository) {
        this.mongoTemplate = mongoTemplate;
        this.userArtifactRepository = userArtifactRepository;
        this.ratingRepository = ratingRepository;
    }

    @Override
    public Page<Artifact> searchArtifacts(String anyField, String title, String category, String culture,
                                          String department, String period, String medium, String artistName,
                                          String tags, LocalDate fromDate, LocalDate toDate,
                                          String locationQuery, Double latitude, Double longitude, Double radius,
                                          String city, String country, String sortBy, Pageable pageable) {
        Query query = new Query().with(pageable);
        List<Criteria> specificFieldCriteria = new ArrayList<>();
        
        // Get curator artifacts that are pending or rejected and should be excluded
        List<UserArtifact> pendingArtifacts = userArtifactRepository.findByStatus(ApplicationStatus.pending);
        List<UserArtifact> rejectedArtifacts = userArtifactRepository.findByStatus(ApplicationStatus.rejected);
        
        List<String> pendingOrRejectedArtifactIds = new ArrayList<>();
        pendingArtifacts.forEach(ua -> pendingOrRejectedArtifactIds.add(ua.getArtifactId()));
        rejectedArtifacts.forEach(ua -> pendingOrRejectedArtifactIds.add(ua.getArtifactId()));
        
        System.out.println("🚫 Excluding " + pendingOrRejectedArtifactIds.size() + " pending/rejected curator artifacts from search");
        if (!pendingOrRejectedArtifactIds.isEmpty()) {
            System.out.println("Excluded artifact IDs: " + pendingOrRejectedArtifactIds);
            System.out.println("🔴 CRITICAL: Using _id field (not id) to exclude artifacts from MongoDB");
        } else {
            System.out.println("✅ No pending/rejected artifacts found - all artifacts will be shown");
        }
        
        // Create status filter criteria (separate from search criteria)
        Criteria statusFilterCriteria = null;
        if (!pendingOrRejectedArtifactIds.isEmpty()) {
            statusFilterCriteria = Criteria.where("_id").nin(pendingOrRejectedArtifactIds);
        }

        if (StringUtils.hasText(title)) {
            specificFieldCriteria.add(Criteria.where("title").regex(title, "i"));
        }
        if (StringUtils.hasText(category)) {
            specificFieldCriteria.add(Criteria.where("category").regex(category, "i")); // fixed
        }
        if (StringUtils.hasText(culture)) {
            specificFieldCriteria.add(Criteria.where("culture").regex(culture, "i"));
        }
        if (StringUtils.hasText(department)) {
            specificFieldCriteria.add(Criteria.where("department").regex(department, "i"));
        }
        if (StringUtils.hasText(period)) {
            specificFieldCriteria.add(Criteria.where("period").regex(period, "i"));
        }
        if (StringUtils.hasText(medium)) {
            specificFieldCriteria.add(Criteria.where("medium").regex(medium, "i"));
        }
        if (StringUtils.hasText(artistName)) {
            specificFieldCriteria.add(Criteria.where("artist_name").regex(artistName, "i"));
        }
        if (StringUtils.hasText(tags)) {
            specificFieldCriteria.add(Criteria.where("tags").regex(tags, "i"));
        }
        if (fromDate != null && toDate != null) {
            specificFieldCriteria.add(Criteria.where("exact_found_date").gte(fromDate).lte(toDate));
        } else if (fromDate != null) {
            specificFieldCriteria.add(Criteria.where("exact_found_date").gte(fromDate));
        } else if (toDate != null) {
            specificFieldCriteria.add(Criteria.where("exact_found_date").lte(toDate));
        }
        
        // Location filtering
        if (StringUtils.hasText(locationQuery)) {
            // Search by location name/placename
            specificFieldCriteria.add(
                new Criteria().orOperator(
                    Criteria.where("location.placename").regex(locationQuery, "i"),
                    Criteria.where("location.city").regex(locationQuery, "i"),
                    Criteria.where("location.country").regex(locationQuery, "i")
                )
            );
        }
        
        if (StringUtils.hasText(city)) {
            specificFieldCriteria.add(Criteria.where("location.city").regex(city, "i"));
        }
        
        if (StringUtils.hasText(country)) {
            specificFieldCriteria.add(Criteria.where("location.country").regex(country, "i"));
        }
        
        // Geographic proximity search
        if (latitude != null && longitude != null && radius != null) {
            // Convert radius from km to degrees (approximation: 1 degree ≈ 111km)
            double radiusInDegrees = radius / 111.0;
            specificFieldCriteria.add(
                Criteria.where("location.latitude").gte(latitude - radiusInDegrees).lte(latitude + radiusInDegrees)
            );
            specificFieldCriteria.add(
                Criteria.where("location.longitude").gte(longitude - radiusInDegrees).lte(longitude + radiusInDegrees)
            );
        }

        Criteria combinedCriteria = new Criteria();
        if (StringUtils.hasText(anyField)) {
            Criteria keywordSearch = new Criteria().orOperator(
                Criteria.where("title").regex(anyField, "i"),
                Criteria.where("description").regex(anyField, "i"),
                Criteria.where("culture").regex(anyField, "i"),
                Criteria.where("department").regex(anyField, "i"),
                Criteria.where("period").regex(anyField, "i"),
                Criteria.where("medium").regex(anyField, "i"),
                Criteria.where("artist_name").regex(anyField, "i")
            );

            if (!specificFieldCriteria.isEmpty()) {
                combinedCriteria.andOperator(
                        new Criteria().andOperator(specificFieldCriteria.toArray(new Criteria[0])),
                        keywordSearch
                );
            } else {
                combinedCriteria = keywordSearch;
            }
        } else if (!specificFieldCriteria.isEmpty()) {
            combinedCriteria.andOperator(specificFieldCriteria.toArray(new Criteria[0]));
        }

        // Apply search criteria if any
        if (!combinedCriteria.getCriteriaObject().isEmpty()) {
            if (statusFilterCriteria != null) {
                // Combine search criteria with status filter
                query.addCriteria(new Criteria().andOperator(combinedCriteria, statusFilterCriteria));
            } else {
                query.addCriteria(combinedCriteria);
            }
        } else if (statusFilterCriteria != null) {
            // Only apply status filter if no search criteria
            query.addCriteria(statusFilterCriteria);
        }

        // Get all artifacts first without pagination for sorting
        Query countQuery = Query.of(query).limit(-1).skip(-1);
        long totalCount = mongoTemplate.count(countQuery, Artifact.class);
        
        // Get all artifacts for sorting (we'll paginate after sorting)
        Query allQuery = Query.of(query).limit(-1).skip(-1);
        List<Artifact> allArtifacts = mongoTemplate.find(allQuery, Artifact.class);
        
        // Apply sorting if specified
        List<Artifact> sortedArtifacts = applySorting(allArtifacts, sortBy);
        
        // Manual pagination after sorting
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), sortedArtifacts.size());
        List<Artifact> paginatedArtifacts = start >= sortedArtifacts.size() ? 
            new ArrayList<>() : 
            sortedArtifacts.subList(start, end);
            
        return new PageImpl<>(paginatedArtifacts, pageable, totalCount);
    }
    
    private List<Artifact> applySorting(List<Artifact> artifacts, String sortBy) {
        if (sortBy == null || sortBy.isEmpty() || "best_match".equals(sortBy)) {
            // Default order - no additional sorting needed
            return artifacts;
        }
        
        switch (sortBy.toLowerCase()) {
            case "ascending":
                return artifacts.stream()
                    .sorted(Comparator.comparing(artifact -> 
                        artifact.getTitle() != null ? artifact.getTitle().toLowerCase() : ""))
                    .collect(Collectors.toList());
                    
            case "descending":
                return artifacts.stream()
                    .sorted(Comparator.comparing((Artifact artifact) -> 
                        artifact.getTitle() != null ? artifact.getTitle().toLowerCase() : "").reversed())
                    .collect(Collectors.toList());
                    
            case "most_few": // Most favorite (highest rating first)
                return sortByRating(artifacts, false);
                
            case "least_few": // Least favorite (lowest rating first)
                return sortByRating(artifacts, true);
                
            default:
                System.out.println("⚠️ Unknown sort option: " + sortBy + ", using default order");
                return artifacts;
        }
    }
    
    private List<Artifact> sortByRating(List<Artifact> artifacts, boolean ascending) {
        // Get average ratings for all artifacts
        Map<String, Double> ratingMap = new HashMap<>();
        
        for (Artifact artifact : artifacts) {
            Double avgRating = ratingRepository.findAverageRatingByArtifactId(artifact.getId());
            ratingMap.put(artifact.getId(), avgRating != null ? avgRating : 0.0);
        }
        
        // Sort by rating
        Comparator<Artifact> ratingComparator = Comparator.comparing(artifact -> 
            ratingMap.getOrDefault(artifact.getId(), 0.0));
            
        if (!ascending) {
            ratingComparator = ratingComparator.reversed();
        }
        
        return artifacts.stream()
            .sorted(ratingComparator)
            .collect(Collectors.toList());
    }
    
    @Override
    public Page<Artifact> globalSearch(String search, Pageable pageable) {
        Query query = new Query().with(pageable);
        
        // Get curator artifacts that are pending or rejected and should be excluded
        List<UserArtifact> pendingArtifacts = userArtifactRepository.findByStatus(ApplicationStatus.pending);
        List<UserArtifact> rejectedArtifacts = userArtifactRepository.findByStatus(ApplicationStatus.rejected);
        
        List<String> pendingOrRejectedArtifactIds = new ArrayList<>();
        pendingArtifacts.forEach(ua -> pendingOrRejectedArtifactIds.add(ua.getArtifactId()));
        rejectedArtifacts.forEach(ua -> pendingOrRejectedArtifactIds.add(ua.getArtifactId()));
        
        System.out.println("🚫 Excluding " + pendingOrRejectedArtifactIds.size() + " pending/rejected curator artifacts from global search");
        if (!pendingOrRejectedArtifactIds.isEmpty()) {
            System.out.println("Excluded artifact IDs from global search: " + pendingOrRejectedArtifactIds);
            System.out.println("🔴 CRITICAL: Using _id field (not id) to exclude artifacts from MongoDB in global search");
        } else {
            System.out.println("✅ No pending/rejected artifacts found - all artifacts will be shown in global search");
        }
        
        // Create criteria to exclude pending/rejected curator artifacts
        Criteria statusFilterCriteria = null;
        if (!pendingOrRejectedArtifactIds.isEmpty()) {
            statusFilterCriteria = Criteria.where("_id").nin(pendingOrRejectedArtifactIds);
        }

        if (StringUtils.hasText(search)) {
            Criteria searchCriteria = new Criteria().orOperator(
                Criteria.where("title").regex(search, "i"),
                Criteria.where("description").regex(search, "i"),
                Criteria.where("culture").regex(search, "i"),
                Criteria.where("department").regex(search, "i"),
                Criteria.where("period").regex(search, "i"),
                Criteria.where("medium").regex(search, "i"),
                Criteria.where("artist_name").regex(search, "i"),
                Criteria.where("tags").regex(search, "i")
            );
            
            // Combine status filter with search criteria if needed
            if (statusFilterCriteria != null) {
                query.addCriteria(new Criteria().andOperator(statusFilterCriteria, searchCriteria));
            } else {
                query.addCriteria(searchCriteria);
            }
        } else {
            // Only status filter if no search query and filter exists
            if (statusFilterCriteria != null) {
                query.addCriteria(statusFilterCriteria);
            }
        }

        List<Artifact> results = mongoTemplate.find(query, Artifact.class);
        return PageableExecutionUtils.getPage(
            results,
            pageable,
            () -> mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Artifact.class)
        );
    }

}
