package com.example.demo.dto;

import java.time.Instant;

public class UserArtifactDTO {
    private Integer userArtifactId;
    private String artifactId;
    private Integer userId;
    private Instant savedAt;
    private String status;

    public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

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
}