package com.example.demo.dto;

import java.time.Instant;
import java.time.LocalDate;

public class ReviewCuratorAppDto {
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
    private Instant submittedAt;
    private String applicationStatus;

    public ReviewCuratorAppDto(Integer applicationId, String username, String email,
                               String fname, LocalDate dob, String educationalBackground,
                               String certification, String certificationPath,
                               String personalExperience, String portfolioLink,
                               String motivationReason, Instant submittedAt,
                               String applicationStatus) {
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
        this.applicationStatus = applicationStatus;
    }

    // Getters and setters (or use Lombok @Getter/@Setter)
}
