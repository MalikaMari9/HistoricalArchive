package com.example.demo.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "curatorapplication_tbl")
public class CuratorApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "application_id")
    private Integer applicationId;

    @Column(length = 100)
    private String fname;

    @Column(length = 400)
    private String educationalBackground;

    private LocalDate dob;

    @Column(length = 400)
    private String certification;

    //well technically they can upload a CV
    @Column(name = "certification_path", length = 255)
    private String certificationPath;
    
    @Column(length = 400)
    private String personalExperience;
    
    @Column(length = 400)
    private String portfolioLink;
    
    @Column(length = 400)
    private String motivationReason;
    

    @Column(name = "submitted_at", updatable = false)
    private Instant submittedAt = Instant.now(); // default on insert
    
    public Instant getSubmittedAt() {
		return submittedAt;
	}

	public void setSubmittedAt(Instant submittedAt) {
		this.submittedAt = submittedAt;
	}

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "application_status", nullable = false)
    private ApplicationStatus applicationStatus;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "professor_id") // this is new
    private User professor; // the professor who reviewed this application

    @Column(name = "reviewed_at")
    private Instant reviewedAt;


    // Getters and setters

    public String getRejectionReason() {
		return rejectionReason;
	}

	public void setRejectionReason(String rejectionReason) {
		this.rejectionReason = rejectionReason;
	}

	public ApplicationStatus getApplicationStatus() {
		return applicationStatus;
	}

	public void setApplicationStatus(ApplicationStatus applicationStatus) {
		this.applicationStatus = applicationStatus;
	}

	public Integer getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Integer applicationId) {
        this.applicationId = applicationId;
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

    public String getEducationalBackground() {
		return educationalBackground;
	}

	public void setEducationalBackground(String educationalBackground) {
		this.educationalBackground = educationalBackground;
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

	public void setDob(LocalDate dob) {
        this.dob = dob;
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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

	public User getProfessor() {
		return professor;
	}

	public void setProfessor(User professor) {
		this.professor = professor;
	}

	public Instant getReviewedAt() {
		return reviewedAt;
	}

	public void setReviewedAt(Instant reviewedAt) {
		this.reviewedAt = reviewedAt;
	}
	
	
    
    
}
