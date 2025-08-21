package com.example.demo.dto;

import java.time.LocalDate;

public class PendingCuratorDTO {

    private Integer applicationId;
    private String username;
    private String email;

    private String fname;
    private LocalDate dob;
    private String educationalBackground;
    private String certification;
    private String certificationPath;
    private String personalExperience;
    private String portfolioLink;
    private String motivationReason;

    private LocalDate submittedAt; // could use application creation time if tracked

    public PendingCuratorDTO() {
    }

    public PendingCuratorDTO(
        Integer applicationId,
        String username,
        String email,
        String fname,
        LocalDate dob,
        String educationalBackground,
        String certification,
        String certificationPath,
        String personalExperience,
        String portfolioLink,
        String motivationReason,
        LocalDate submittedAt
    ) {
        this.applicationId = applicationId;
        this.username = username;
        this.email = email;
        this.fname = fname;
        this.dob = dob;
        this.educationalBackground = educationalBackground;
        this.certification = certification;
        this.certificationPath = certificationPath;
        this.personalExperience = personalExperience;
        this.portfolioLink = portfolioLink;
        this.motivationReason = motivationReason;
        this.submittedAt = submittedAt;
    }

    public Integer getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Integer applicationId) {
        this.applicationId = applicationId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFname() {
        return fname;
    }

    public void setFname(String fname) {
        this.fname = fname;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public String getEducationalBackground() {
        return educationalBackground;
    }

    public void setEducationalBackground(String educationalBackground) {
        this.educationalBackground = educationalBackground;
    }

    public String getCertification() {
        return certification;
    }

    public void setCertification(String certification) {
        this.certification = certification;
    }

    public String getCertificationPath() {
        return certificationPath;
    }

    public void setCertificationPath(String certificationPath) {
        this.certificationPath = certificationPath;
    }

    public String getPersonalExperience() {
        return personalExperience;
    }

    public void setPersonalExperience(String personalExperience) {
        this.personalExperience = personalExperience;
    }

    public String getPortfolioLink() {
        return portfolioLink;
    }

    public void setPortfolioLink(String portfolioLink) {
        this.portfolioLink = portfolioLink;
    }

    public String getMotivationReason() {
        return motivationReason;
    }

    public void setMotivationReason(String motivationReason) {
        this.motivationReason = motivationReason;
    }

    public LocalDate getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDate submittedAt) {
        this.submittedAt = submittedAt;
    }
}
