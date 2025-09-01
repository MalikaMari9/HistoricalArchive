package com.example.demo.repository;

import com.example.demo.dto.PendingArtworkRequest;
import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.UserArtifact;

import java.util.Collection;
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
	
	
	
	 Optional<UserArtifact> findTopByArtifactIdAndUserIdOrderBySavedAtDesc(String artifactId, Integer userId);
	List<UserArtifact> findByStatus(ApplicationStatus status);
	
	long countByStatus(ApplicationStatus status);

	Page<UserArtifact> findAllByOrderBySavedAtDesc(Pageable pageable);

	Page<UserArtifact> findByStatusOrderBySavedAtDesc(ApplicationStatus status, Pageable pageable);
	
	 Optional<UserArtifact> findByArtifactIdAndUserId(String artifactId, Integer userId);
	
	 
	 UserArtifact findByUserIdAndArtifactId(Integer userId, String artifactId);
	 
	 List<UserArtifact> findByUserIdAndArtifactIdIn(Integer userId, List<String> artifactIds);

	 List<UserArtifact> findByArtifactIdIn(List<String> artifactIds);

	 @Query("SELECT ua FROM UserArtifact ua WHERE ua.status IN :statuses ORDER BY ua.savedAt DESC")
	 List<UserArtifact> findTop5ByStatuses(@Param("statuses") List<ApplicationStatus> statuses, Pageable pageable);

	 List<UserArtifact> findByStatusInOrderBySavedAtDesc(List<ApplicationStatus> of, Pageable pageable);

	 @Query("SELECT ua.status FROM UserArtifact ua WHERE ua.artifactId = :artifactId AND ua.userId = :userId")
	    Optional<ApplicationStatus> findStatusByArtifactIdAndUserId(@Param("artifactId") String artifactId, 
	                                                               @Param("userId") Integer userId);

	    @Query("SELECT ua FROM UserArtifact ua WHERE ua.artifactId = :artifactId AND ua.userId = :userId")
	    Optional<UserArtifact> findUserArtifactByArtifactIdAndUserId(@Param("artifactId") String artifactId, 
	                                                                @Param("userId") Integer userId);
	    List<UserArtifact> findByArtifactId(String artifactId);
	    @Query("SELECT ua FROM UserArtifact ua WHERE ua.status IN :statuses ORDER BY ua.savedAt DESC")
	    List<UserArtifact> findTopNByStatuses(@Param("statuses") List<ApplicationStatus> statuses, Pageable pageable);
	    
	    Page<UserArtifact> findByUserIdOrderBySavedAtDesc(Integer userId, Pageable pageable);
	    long countByUserId(Integer userId);

		long countByStatusAndProfessorId(ApplicationStatus accepted, Integer userId);
	    
		@Query("SELECT ua FROM UserArtifact ua WHERE ua.status IN :statuses AND ua.professorId = :professorId ORDER BY ua.savedAt DESC")
		Page<UserArtifact> findTopNByStatusesAndProfessorId(@Param("statuses") List<ApplicationStatus> statuses,
		                                                    @Param("professorId") Integer professorId,
		                                                    Pageable pageable);

		Page<UserArtifact> findByStatusAndProfessorIdOrderBySavedAtDesc(ApplicationStatus status, Integer userId,
				Pageable pageable);

		List<UserArtifact> findByStatusOrderBySavedAtDesc(ApplicationStatus status);

		List<UserArtifact> findByStatusAndProfessorIdOrderBySavedAtDesc(ApplicationStatus status, Integer userId);

		List<UserArtifact> findAllByOrderBySavedAtDesc();

		Optional<UserArtifact> findFirstByArtifactId(String artifactId);

}



