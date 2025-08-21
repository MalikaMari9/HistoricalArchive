package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rating_tbl", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "user_artifact_id"})
})
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rating_id")
    private Integer ratingId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @ManyToOne
    @JoinColumn(name = "user_artifact_id", nullable = false)
    private UserArtifact userArtifact;

    @Column(name = "rating_value", nullable = false)
    private Integer ratingValue;

    @Column(name = "rated_at")
    private LocalDateTime ratedAt = LocalDateTime.now();

    // === Getters and Setters ===

    public Integer getRatingId() {
        return ratingId;
    }

    public void setRatingId(Integer ratingId) {
        this.ratingId = ratingId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public UserArtifact getUserArtifact() {
        return userArtifact;
    }

    public void setUserArtifact(UserArtifact userArtifact) {
        this.userArtifact = userArtifact;
    }

    public Integer getRatingValue() {
        return ratingValue;
    }

    public void setRatingValue(Integer ratingValue) {
        this.ratingValue = ratingValue;
    }

    public LocalDateTime getRatedAt() {
        return ratedAt;
    }

    public void setRatedAt(LocalDateTime ratedAt) {
        this.ratedAt = ratedAt;
    }
}
