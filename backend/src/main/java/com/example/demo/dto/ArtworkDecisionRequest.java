package com.example.demo.dto;

import java.time.LocalDateTime;

public class ArtworkDecisionRequest {
    private String artworkTitle;
    private String decision;
    private String curator;
    private LocalDateTime decisionDate;
    
    // Constructors
    public ArtworkDecisionRequest() {}
    
    public ArtworkDecisionRequest(String artworkTitle, String decision, String curator, 
                                LocalDateTime decisionDate) {
        this.artworkTitle = artworkTitle;
        this.decision = decision;
        this.curator = curator;
        this.decisionDate = decisionDate;
    }
    
    // Getters and Setters
    public String getArtworkTitle() { return artworkTitle; }
    public void setArtworkTitle(String artworkTitle) { this.artworkTitle = artworkTitle; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getCurator() { return curator; }
    public void setCurator(String curator) { this.curator = curator; }
    public LocalDateTime getDecisionDate() { return decisionDate; }
    public void setDecisionDate(LocalDateTime decisionDate) { this.decisionDate = decisionDate; }
}