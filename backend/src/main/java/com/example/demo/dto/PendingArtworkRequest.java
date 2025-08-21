package com.example.demo.dto;

import java.time.LocalDateTime;

public class PendingArtworkRequest {
    private Long id;
    private String title;
    private String curator;
    private String category;
    private LocalDateTime submittedDate;
    private String priority;
    
    // Constructors
    public PendingArtworkRequest() {}
    
    public PendingArtworkRequest(Long id, String title, String curator, String category, 
                               LocalDateTime submittedDate, String priority) {
        this.id = id;
        this.title = title;
        this.curator = curator;
        this.category = category;
        this.submittedDate = submittedDate;
        this.priority = priority;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCurator() { return curator; }
    public void setCurator(String curator) { this.curator = curator; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public LocalDateTime getSubmittedDate() { return submittedDate; }
    public void setSubmittedDate(LocalDateTime submittedDate) { this.submittedDate = submittedDate; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
}