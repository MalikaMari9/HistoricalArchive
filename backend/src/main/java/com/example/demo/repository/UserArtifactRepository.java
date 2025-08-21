package com.example.demo.repository;

import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.UserArtifact;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserArtifactRepository extends JpaRepository<UserArtifact, Integer> {
    boolean existsByArtifactIdAndUserId(String artifactId, Integer userId);
    
    @Modifying
    @Query("DELETE FROM UserArtifact ua WHERE ua.artifactId = :artifactId AND ua.userId = :userId")
    int deleteByArtifactIdAndUserId(@Param("artifactId") String artifactId, @Param("userId") Integer userId);

	List<UserArtifact> findByUserId(Integer userId);
	
	Optional<UserArtifact> findByArtifactId(String artifactId);
	
	 Optional<UserArtifact> findTopByArtifactIdAndUserIdOrderBySavedAtDesc(String artifactId, Integer userId);
	List<UserArtifact> findByStatus(ApplicationStatus status);
	
	long countByStatus(ApplicationStatus status);

	Page<UserArtifact> findAllByOrderBySavedAtDesc(Pageable pageable);

	Page<UserArtifact> findByStatusOrderBySavedAtDesc(ApplicationStatus status, Pageable pageable);
	
	 Optional<UserArtifact> findByArtifactIdAndUserId(String artifactId, Integer userId);
	
	 
	 UserArtifact findByUserIdAndArtifactId(Integer userId, String artifactId);
}

