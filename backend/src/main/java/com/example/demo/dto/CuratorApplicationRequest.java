package com.example.demo.dto;

import java.time.Instant;
import java.time.LocalDate;

public class CuratorApplicationRequest {

	 private Integer applicationId;
    private String fname;
    private String educationalBackground;
    private String certification;
    private String personalExperience;
    private String portfolioLink;
    private String motivationReason;
    private LocalDate dob;

    private String username;
    private String email;
    private Instant submittedAt;
    // with corresponding getters and setters

    // Getters and Setters

    public String getUsername() {
		return username;
	}

	public int getApplicationId() {
		return applicationId;
	}

	public void setApplicationId(Integer applicationId) {
		this.applicationId = applicationId;
	}

	public Instant getSubmittedAt() {
		return submittedAt;
	}

	public void setSubmittedAt(Instant submittedAt) {
		this.submittedAt = submittedAt;
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

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }
}
