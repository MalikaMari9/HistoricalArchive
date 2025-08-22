package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CuratorStats {
    private long totalArtworks;
    private long pendingArtworks;
    private long approvedArtworks;
    private long rejectedArtworks;

    public CuratorStats() {}

    public CuratorStats(long totalArtworks, long pendingArtworks, long approvedArtworks, long rejectedArtworks) {
        this.totalArtworks = totalArtworks;
        this.pendingArtworks = pendingArtworks;
        this.approvedArtworks = approvedArtworks;
        this.rejectedArtworks = rejectedArtworks;
    }

    // Getters and Setters
    public long getTotalArtworks() {
        return totalArtworks;
    }

    public void setTotalArtworks(long totalArtworks) {
        this.totalArtworks = totalArtworks;
    }

    public long getPendingArtworks() {
        return pendingArtworks;
    }

    public void setPendingArtworks(long pendingArtworks) {
        this.pendingArtworks = pendingArtworks;
    }

    public long getApprovedArtworks() {
        return approvedArtworks;
    }

    public void setApprovedArtworks(long approvedArtworks) {
        this.approvedArtworks = approvedArtworks;
    }

    public long getRejectedArtworks() {
        return rejectedArtworks;
    }

    public void setRejectedArtworks(long rejectedArtworks) {
        this.rejectedArtworks = rejectedArtworks;
    }
}