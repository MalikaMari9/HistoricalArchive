package com.example.demo.repository;

import com.example.demo.entity.Artifact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArtifactRepository extends MongoRepository<Artifact, String>, CustomArtifactRepository{

    
   
    // Single artifact lookup
    @Query("{ '_id' : ?0 }")
    Optional<Artifact> findById(String _id);

    // Distinct values queries - Fixed to use aggregation pipeline
    @Aggregation(pipeline = {
        "{ '$group': { '_id': '$category' } }",
        "{ '$match': { '_id': { '$ne': null } } }",
        "{ '$sort': { '_id': 1 } }",
        "{ '$project': { '_id': 0, 'category': '$_id' } }"
    })
    List<String> findAllDistinctCategories();

    @Aggregation(pipeline = {
        "{ '$group': { '_id': '$period' } }",
        "{ '$match': { '_id': { '$ne': null } } }",
        "{ '$sort': { '_id': 1 } }",
        "{ '$project': { '_id': 0, 'period': '$_id' } }"
    })
    List<String> findAllDistinctPeriods();

    @Aggregation(pipeline = {
        "{ '$group': { '_id': '$culture' } }",
        "{ '$match': { '_id': { '$ne': null } } }",
        "{ '$sort': { '_id': 1 } }",
        "{ '$project': { '_id': 0, 'culture': '$_id' } }"
    })
    List<String> findAllDistinctCultures();

    @Aggregation(pipeline = {
        "{ '$group': { '_id': '$department' } }",
        "{ '$match': { '_id': { '$ne': null } } }",
        "{ '$sort': { '_id': 1 } }",
        "{ '$project': { '_id': 0, 'department': '$_id' } }"
    })
    List<String> findAllDistinctDepartments();

    // Projection queries for specific fields
    @Query(value = "{ '_id' : ?0 }", fields = "{ 'images' : 1 }")
    List<String> findArtifactImages(String _id);

    @Query(value = "{ '_id' : ?0 }", fields = "{ 'comments' : 1 }")
    List<Object> findArtifactComments(String _id);

    // Additional helper methods that might be useful
    @Query(value = "{ 'category': ?0 }", count = true)
    long countByCategory(String category);

    @Query(value = "{ '_id' : ?0 }", fields = "{ 'title' : 1, 'images' : 1 }")
    Optional<Artifact> findBasicArtifactInfo(String _id);
    
    @Query(value = "{}", fields = "{ 'id' : 1 }")
    List<Artifact> findAllIds();
    
    @Query(value = "{}", sort = "{ '_id' : -1 }", fields = "{ 'id' : 1 }")
    List<Artifact> findTopByOrderByIdDesc();
    
    default Integer findMaxArtifactIdNumber() {
        List<Artifact> artifacts = findTopByOrderByIdDesc();
        if (artifacts.isEmpty()) {
            return 0;
        }
        String lastId = artifacts.get(0).getId();
        try {
            return Integer.parseInt(lastId.substring(2)); // assumes format "a_123"
        } catch (NumberFormatException | StringIndexOutOfBoundsException e) {
            return 0;
        }
    }

    @Query("{ 'uploaded_by' : ?0 }")
	Page<Artifact> findByUploaded_by(String username, Pageable pageable);
    
    @Query("{ '_id': { $in: ?0 } }")
    List<Artifact> findByIdsIn(List<String> artifactIds);
}
