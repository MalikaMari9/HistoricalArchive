package com.example.demo.repository;

import org.springframework.data.domain.PageRequest;
import com.example.demo.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Integer> {
//   /* List<Comment> findByUserArtifact_ArtifactIdOrderByCreatedAtDesc(String artifactId);*/
    
    List<Comment> findByUserArtifactArtifactIdAndParentIsNull(String artifactId);
    
    @Query("SELECT c FROM Comment c JOIN FETCH c.user WHERE c.userArtifact.artifactId = :artifactId AND c.parent IS NULL ORDER BY c.createdAt DESC")
    List<Comment> findByUserArtifact_ArtifactIdOrderByCreatedAtDesc(@Param("artifactId") String artifactId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.user WHERE c.parent.commentId = :parentId ORDER BY c.createdAt ASC")
    List<Comment> findRepliesByParentId(@Param("parentId") Integer parentId);
    
    
    @Query("SELECT c FROM Comment c " +
 	       "JOIN FETCH c.user " +
 	       "JOIN FETCH c.userArtifact ua " +
 	       "WHERE ua.userArtifactId IN :userArtifactIds " +
 	       "ORDER BY c.createdAt DESC")
 	List<Comment> findByUserArtifact_UserArtifactIdInOrderByCreatedAtDesc(
 	    @Param("userArtifactIds") Collection<Integer> userArtifactIds, 
 	    PageRequest pageRequest);
}
