package com.example.demo.dto;

import java.time.LocalDateTime;

public class ActivityRequest {
    private Long id;
    private String action;
    private String details;
    private LocalDateTime timestamp;
    
    // Constructors
    public ActivityRequest() {}
    
    public ActivityRequest(Long id, String action, String details, LocalDateTime timestamp) {
        this.id = id;
        this.action = action;
        this.details = details;
        this.timestamp = timestamp;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

}