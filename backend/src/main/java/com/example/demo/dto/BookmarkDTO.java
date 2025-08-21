package com.example.demo.dto;

import java.time.LocalDateTime;

public class BookmarkDTO {
    private Integer bookmarkId;
    private String artifactId;
    private Integer userId;
    private LocalDateTime createdAt;
    
    // Getters and Setters
    public Integer getBookmarkId() {
        return bookmarkId;
    }
    
    public void setBookmarkId(Integer bookmarkId) {
        this.bookmarkId = bookmarkId;
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
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}