package com.example.demo.dto;

import com.example.demo.entity.Artifact;
import com.example.demo.entity.LocationInfo;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
/**
 * 
 */
@Data
public class ArtifactDTO {
	@JsonProperty("_id")
    private String _id;
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
    private LocationInfo location;
    private String uploaded_by;
    private Instant uploaded_at;
    private Instant updated_at;
    private double averageRating;
    private int totalRatings;
    private String status;
    private List<Artifact.ArtifactImage> images;
    @JsonProperty("image_url")
    private String image_url;

    public String get_id() {
		return _id;
	}

	public void set_id(String _id) {
		this._id = _id;
	}

	public String getImage_url() {
		return image_url;
	}

	public void setImage_url(String image_url) {
		this.image_url = image_url;
	}

	@Data
    public static class ArtifactImage {
        private String date;
        private String copyright;
        private Integer imageid;
        private Integer idsid;
        private String format;
        private String description;
        private String technique;
        private String renditionnumber;
        private Integer displayorder;
        private String baseimageurl;
        private String alttext;
        private Integer width;
        private String publiccaption;
        private String iiifbaseuri;
        private Integer height;
        
    }

	public String get_Id() {
		return _id;
	}

	public void set_Id(String _id) {
		this._id = _id;
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

	public double getAverageRating() {
		return averageRating;
	}

	public void setAverageRating(double averageRating) {
		this.averageRating = averageRating;
	}

	public int getTotalRatings() {
		return totalRatings;
	}

	public void setTotalRatings(int totalRatings) {
		this.totalRatings = totalRatings;
	}

	public List<Artifact.ArtifactImage> getImages() {
        return images;
    }

    public void setImages(List<Artifact.ArtifactImage> images) {
        this.images = images;
    }

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}
    
    
    


}
