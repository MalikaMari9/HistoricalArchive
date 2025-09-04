package com.example.demo.repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;
import com.example.demo.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Integer> {
    Optional<Rating> findByUserIdAndUserArtifact_ArtifactId(Integer userId, String artifactId);
    
    @Query("SELECT AVG(r.ratingValue) FROM Rating r WHERE r.userArtifact.artifactId = :artifactId")
    Double findAverageRatingByArtifactId(@Param("artifactId") String artifactId);
    
    @Query("SELECT COUNT(r) FROM Rating r WHERE r.userArtifact.artifactId = :artifactId")
    Long countByArtifactId(@Param("artifactId") String artifactId);
    
    @Query(value = "SELECT r.artifact, AVG(r.ratingValue) as avgRating " +
            "FROM Rating r " +
            "GROUP BY r.artifact " +
            "ORDER BY avgRating DESC " +
            "LIMIT 1", // Limit the result to a single entry
            nativeQuery = true) // Using a native query for LIMIT
     Optional<Object[]> findTopRatedArtifactWithAverageRating(); // Changed method name
     
     @Query("SELECT r.userArtifact.artifactId, AVG(r.ratingValue) as avgRating " +
             "FROM Rating r " +
             "GROUP BY r.userArtifact.artifactId " +
             "ORDER BY avgRating DESC " +
             "LIMIT 3") //change limit here
      List<Object[]> findTopRatedArtifacts();

      @Modifying
      @Transactional
      @Query("DELETE FROM Rating r WHERE r.userArtifact.userArtifactId IN :userArtifactIds")
      void deleteByUserArtifactIds(@Param("userArtifactIds") List<Integer> userArtifactIds);

  }
 
    
    

