package com.example.demo.dto;

import com.example.demo.entity.Artifact.ArtifactImage;
import com.example.demo.entity.LocationInfo;
import com.example.demo.entity.ApplicationStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PendingArtifactDTO {

    // --- Existing artifact fields ---
    private String id;
    private String title;
    private String description;
    private String category;
    private String culture;
    private String department;
    private String period;
    private LocalDate exact_found_date;
    private String medium;
    private String dimension;
    private List<String> tags;
    private List<ArtifactImage> images;
    private LocationInfo location;
    private String uploaded_by;
    private Instant uploaded_at;
    private Instant updated_at;
    private String artist_name;

    @JsonProperty("image_url")
    private String image_url;

    // --- New fields from user_artifact_tbl ---
    private Integer submissionId;           // user_artifact_id
    private ApplicationStatus status;       // pending/accepted/rejected
    private Instant submittedAt;             // saved_at
    private String reason;                   // rejection reason if any
    private Integer professorId;             // who approved/rejected

    // --- New fields from user_tbl (curator) ---
    private Integer curatorId;               // user_id
    private String curatorUsername;
    private String curatorEmail;
    private String curatorProfilePath;
    private LocalDateTime curatorCreatedAt;

    public PendingArtifactDTO() {}

    public PendingArtifactDTO(String id, String title, String description, String category, String culture,
                               String department, String period, LocalDate exact_found_date, String medium,
                               String dimension, List<String> tags, List<ArtifactImage> images,
                               LocationInfo location, String uploaded_by, Instant uploaded_at,
                               Instant updated_at, String artist_name, String image_url,
                               Integer submissionId, ApplicationStatus status, Instant submittedAt,
                               String reason, Integer professorId,
                               Integer curatorId, String curatorUsername, String curatorEmail,
                               String curatorProfilePath, LocalDateTime curatorCreatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.culture = culture;
        this.department = department;
        this.period = period;
        this.exact_found_date = exact_found_date;
        this.medium = medium;
        this.dimension = dimension;
        this.tags = tags;
        this.images = images;
        this.location = location;
        this.uploaded_by = uploaded_by;
        this.uploaded_at = uploaded_at;
        this.updated_at = updated_at;
        this.artist_name = artist_name;
        this.image_url = image_url;
        this.submissionId = submissionId;
        this.status = status;
        this.submittedAt = submittedAt;
        this.reason = reason;
        this.professorId = professorId;
        this.curatorId = curatorId;
        this.curatorUsername = curatorUsername;
        this.curatorEmail = curatorEmail;
        this.curatorProfilePath = curatorProfilePath;
        this.curatorCreatedAt = curatorCreatedAt;
    }

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

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public String getCulture() {
		return culture;
	}

	public void setCulture(String culture) {
		this.culture = culture;
	}

	public String getDepartment() {
		return department;
	}

	public void setDepartment(String department) {
		this.department = department;
	}

	public String getPeriod() {
		return period;
	}

	public void setPeriod(String period) {
		this.period = period;
	}

	public LocalDate getExact_found_date() {
		return exact_found_date;
	}

	public void setExact_found_date(LocalDate exact_found_date) {
		this.exact_found_date = exact_found_date;
	}

	public String getMedium() {
		return medium;
	}

	public void setMedium(String medium) {
		this.medium = medium;
	}

	public String getDimension() {
		return dimension;
	}

	public void setDimension(String dimension) {
		this.dimension = dimension;
	}

	public List<String> getTags() {
		return tags;
	}

	public void setTags(List<String> tags) {
		this.tags = tags;
	}

	public List<ArtifactImage> getImages() {
		return images;
	}

	public void setImages(List<ArtifactImage> images) {
		this.images = images;
	}

	public LocationInfo getLocation() {
		return location;
	}

	public void setLocation(LocationInfo location) {
		this.location = location;
	}

	public String getUploaded_by() {
		return uploaded_by;
	}

	public void setUploaded_by(String uploaded_by) {
		this.uploaded_by = uploaded_by;
	}

	public Instant getUploaded_at() {
		return uploaded_at;
	}

	public void setUploaded_at(Instant uploaded_at) {
		this.uploaded_at = uploaded_at;
	}

	public Instant getUpdated_at() {
		return updated_at;
	}

	public void setUpdated_at(Instant updated_at) {
		this.updated_at = updated_at;
	}

	public String getArtist_name() {
		return artist_name;
	}

	public void setArtist_name(String artist_name) {
		this.artist_name = artist_name;
	}

	public String getImage_url() {
		return image_url;
	}

	public void setImage_url(String image_url) {
		this.image_url = image_url;
	}

	public Integer getSubmissionId() {
		return submissionId;
	}

	public void setSubmissionId(Integer submissionId) {
		this.submissionId = submissionId;
	}

	public ApplicationStatus getStatus() {
		return status;
	}

	public void setStatus(ApplicationStatus status) {
		this.status = status;
	}

	public Instant getSubmittedAt() {
		return submittedAt;
	}

	public void setSubmittedAt(Instant submittedAt) {
		this.submittedAt = submittedAt;
	}

	public String getReason() {
		return reason;
	}

	public void setReason(String reason) {
		this.reason = reason;
	}

	public Integer getProfessorId() {
		return professorId;
	}

	public void setProfessorId(Integer professorId) {
		this.professorId = professorId;
	}

	public Integer getCuratorId() {
		return curatorId;
	}

	public void setCuratorId(Integer curatorId) {
		this.curatorId = curatorId;
	}

	public String getCuratorUsername() {
		return curatorUsername;
	}

	public void setCuratorUsername(String curatorUsername) {
		this.curatorUsername = curatorUsername;
	}

	public String getCuratorEmail() {
		return curatorEmail;
	}

	public void setCuratorEmail(String curatorEmail) {
		this.curatorEmail = curatorEmail;
	}

	public String getCuratorProfilePath() {
		return curatorProfilePath;
	}

	public void setCuratorProfilePath(String curatorProfilePath) {
		this.curatorProfilePath = curatorProfilePath;
	}

	public LocalDateTime getCuratorCreatedAt() {
		return curatorCreatedAt;
	}

	public void setCuratorCreatedAt(LocalDateTime curatorCreatedAt) {
		this.curatorCreatedAt = curatorCreatedAt;
	}

    
    // --- getters & setters for all fields ---
    // (omitted here for brevity, but you’d include them all)
}
