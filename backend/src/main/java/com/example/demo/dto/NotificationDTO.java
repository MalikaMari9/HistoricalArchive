package com.example.demo.dto;

import java.time.LocalDateTime;

public class NotificationDTO {
    private Integer recipientId;
    private Integer sourceId;
    private Integer relatedId;
    private String relatedType;
    private String notificationType;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;

    // Getters & Setters
    public Integer getRecipientId() {
        return recipientId;
    }
    public void setRecipientId(Integer recipientId) {
        this.recipientId = recipientId;
    }
    public Integer getSourceId() {
        return sourceId;
    }
    public void setSourceId(Integer sourceId) {
        this.sourceId = sourceId;
    }
    public Integer getRelatedId() {
        return relatedId;
    }
    public void setRelatedId(Integer relatedId) {
        this.relatedId = relatedId;
    }
    public String getRelatedType() {
        return relatedType;
    }
    public void setRelatedType(String relatedType) {
        this.relatedType = relatedType;
    }
    public String getNotificationType() {
        return notificationType;
    }
    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }
    public String getMessage() {
        return message;
    }
    public void setMessage(String message) {
        this.message = message;
    }
    public boolean isRead() {
        return isRead;
    }
    public void setRead(boolean isRead) {
        this.isRead = isRead;
    }
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
