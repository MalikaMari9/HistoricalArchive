package com.example.demo.dto;

import java.time.LocalDateTime;

public class ArtworkRequest {
    private Long id;
    private String title;
    private String status; // "approved", "pending", "rejected"
    private LocalDateTime submissionDate;
    
    // Constructors
    public ArtworkRequest() {}
    
    public ArtworkRequest(Long id, String title, String status, LocalDateTime submissionDate) {
        this.id = id;
        this.title = title;
        this.status = status;
        this.submissionDate = submissionDate;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getSubmissionDate() {
        return submissionDate;
    }

    public void setSubmissionDate(LocalDateTime submissionDate) {
        this.submissionDate = submissionDate;
    }
}