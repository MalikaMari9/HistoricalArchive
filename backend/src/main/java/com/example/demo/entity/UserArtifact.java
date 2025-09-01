package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_artifact_tbl")
public class UserArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_artifact_id")
    private Integer userArtifactId;

    @Column(name = "artifact_id", nullable = false)
    private String artifactId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(20) DEFAULT 'pending'")
    private ApplicationStatus status = ApplicationStatus.pending;

    @Column(name = "reason")
    private String reason;

    @Column(name = "professor_id")
    private Integer professorId;
    
    @Column(name = "reviewed_at")
    private Instant reviewedAt;
    
    @Column(name = "last_updated_at")
    private Instant lastUpdatedAt;


    // Getters and Setters
    public Integer getUserArtifactId() {
        return userArtifactId;
    }

    public void setUserArtifactId(Integer userArtifactId) {
        this.userArtifactId = userArtifactId;
    }

    public String getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(String artifactId) {
        this.artifactId = artifactId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Instant getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(Instant savedAt) {
        this.savedAt = savedAt;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Integer getProfessorId() {
        return professorId;
    }

    public void setProfessorId(Integer professorId) {
        this.professorId = professorId;
    }

	public Instant getReviewedAt() {
		return reviewedAt;
	}

	public void setReviewedAt(Instant reviewedAt) {
		this.reviewedAt = reviewedAt;
	}
    
	public Instant getLastUpdatedAt() {
	    return lastUpdatedAt;
	}

	public void setLastUpdatedAt(Instant lastUpdatedAt) {
	    this.lastUpdatedAt = lastUpdatedAt;
	}
    
}
