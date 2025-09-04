package com.example.demo.repository;

import com.example.demo.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Integer> {
    List<Bookmark> findByUserUserId(Integer userId);
    
    boolean existsByUserUserIdAndUserArtifactArtifactId(Integer userId, String artifactId);
    
    @Modifying
    @Query("DELETE FROM Bookmark b WHERE b.user.userId = :userId AND b.userArtifact.artifactId = :artifactId")
    void deleteByUserAndArtifact(@Param("userId") Integer userId, @Param("artifactId") String artifactId);
    
    Optional<Bookmark> findByUserUserIdAndUserArtifactArtifactId(Integer userId, String artifactId);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM Bookmark b WHERE b.userArtifact.userArtifactId IN :userArtifactIds")
    void deleteByUserArtifactIds(@Param("userArtifactIds") List<Integer> userArtifactIds);

}