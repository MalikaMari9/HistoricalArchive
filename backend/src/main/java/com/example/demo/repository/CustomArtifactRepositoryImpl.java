package com.example.demo.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import com.example.demo.entity.Artifact;

public class CustomArtifactRepositoryImpl implements CustomArtifactRepository {

    private final MongoTemplate mongoTemplate;

    @Autowired
    public CustomArtifactRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<Artifact> searchArtifacts(String anyField, String title, String category, String culture,
                                          String department, String period, String medium, String artistName,
                                          String tags, LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        Query query = new Query().with(pageable);
        List<Criteria> specificFieldCriteria = new ArrayList<>();

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

        if (!combinedCriteria.getCriteriaObject().isEmpty()) {
            query.addCriteria(combinedCriteria);
        }

        List<Artifact> artifacts = mongoTemplate.find(query, Artifact.class);
        return PageableExecutionUtils.getPage(
                artifacts,
                pageable,
                () -> mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Artifact.class)
        );
    }
    
    @Override
    public Page<Artifact> globalSearch(String search, Pageable pageable) {
        Query query = new Query().with(pageable);

        if (StringUtils.hasText(search)) {
            Criteria orCriteria = new Criteria().orOperator(
                Criteria.where("title").regex(search, "i"),
                Criteria.where("description").regex(search, "i"),
                Criteria.where("culture").regex(search, "i"),
                Criteria.where("department").regex(search, "i"),
                Criteria.where("period").regex(search, "i"),
                Criteria.where("medium").regex(search, "i"),
                Criteria.where("artist_name").regex(search, "i"),
                Criteria.where("tags").regex(search, "i")

            );
            query.addCriteria(orCriteria);
        }

        List<Artifact> results = mongoTemplate.find(query, Artifact.class);
        return PageableExecutionUtils.getPage(
            results,
            pageable,
            () -> mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Artifact.class)
        );
    }

}
