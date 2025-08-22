package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CuratorArtworkItem {
    private String id;
    private String title;
    private String status;
    private String submissionDate;

    public CuratorArtworkItem() {}

    public CuratorArtworkItem(String id, String title, String status, String submissionDate) {
        this.id = id;
        this.title = title;
        this.status = status;
        this.submissionDate = submissionDate;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
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

    public String getSubmissionDate() {
        return submissionDate;
    }

    public void setSubmissionDate(String submissionDate) {
        this.submissionDate = submissionDate;
    }
}