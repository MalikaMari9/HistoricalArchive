package com.example.demo.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.bson.types.Binary;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Document(collection = "artifacts")
public class Artifact {
    @Id
    @Field("_id")
    private String _id;

    // Main artifact fields
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
    
    private Double averageRating;
    private Long totalRatings;

    public String get_id() {
		return _id;
	}
	public void set_id(String _id) {
		this._id = _id;
	}
	public void setAverageRating(Double averageRating) {
		this.averageRating = averageRating;
	}
	public void setTotalRatings(Long totalRatings) {
		this.totalRatings = totalRatings;
	}
	// ArtifactImage inner class
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
        private Binary imageData;

        // Getters and Setters for ArtifactImage
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getCopyright() { return copyright; }
        public void setCopyright(String copyright) { this.copyright = copyright; }

        public Integer getImageid() { return imageid; }
        public void setImageid(Integer imageid) { this.imageid = imageid; }

        public Integer getIdsid() { return idsid; }
        public void setIdsid(Integer idsid) { this.idsid = idsid; }

        public String getFormat() { return format; }
        public void setFormat(String format) { this.format = format; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getTechnique() { return technique; }
        public void setTechnique(String technique) { this.technique = technique; }

        public String getRenditionnumber() { return renditionnumber; }
        public void setRenditionnumber(String renditionnumber) { this.renditionnumber = renditionnumber; }

        public Integer getDisplayorder() { return displayorder; }
        public void setDisplayorder(Integer displayorder) { this.displayorder = displayorder; }

        public String getBaseimageurl() { return baseimageurl; }
        public void setBaseimageurl(String baseimageurl) { this.baseimageurl = baseimageurl; }

        public String getAlttext() { return alttext; }
        public void setAlttext(String alttext) { this.alttext = alttext; }

        public Integer getWidth() { return width; }
        public void setWidth(Integer width) { this.width = width; }

        public String getPubliccaption() { return publiccaption; }
        public void setPubliccaption(String publiccaption) { this.publiccaption = publiccaption; }

        public String getIiifbaseuri() { return iiifbaseuri; }
        public void setIiifbaseuri(String iiifbaseuri) { this.iiifbaseuri = iiifbaseuri; }

        public Integer getHeight() { return height; }
        public void setHeight(Integer height) { this.height = height; }

        public Binary getImageData() { return imageData; }
        public void setImageData(Binary imageData) { this.imageData = imageData; }
    }

    // Getters and Setters for Artifact
    public String getId() { return _id; }
    public void setId(String _id) { this._id = _id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCulture() { return culture; }
    public void setCulture(String culture) { this.culture = culture; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public LocalDate getExact_found_date() { return exact_found_date; }
    public void setExact_found_date(LocalDate exact_found_date) { this.exact_found_date = exact_found_date; }

    public String getMedium() { return medium; }
    public void setMedium(String medium) { this.medium = medium; }

    public String getDimension() { return dimension; }
    public void setDimension(String dimension) { this.dimension = dimension; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public List<ArtifactImage> getImages() { return images; }
    public void setImages(List<ArtifactImage> images) { this.images = images; }

    public LocationInfo getLocation() { return location != null ? location : new LocationInfo(); }
    public void setLocation(LocationInfo location) { this.location = location; }

    public String getUploaded_by() { return uploaded_by; }
    public void setUploaded_by(String uploaded_by) { this.uploaded_by = uploaded_by; }

    public Instant getUploaded_at() { return uploaded_at; }
    public void setUploaded_at(Instant uploaded_at) { this.uploaded_at = uploaded_at; }

    public Instant getUpdated_at() { return updated_at; }
    public void setUpdated_at(Instant updated_at) { this.updated_at = updated_at; }

    public String getArtist_name() { return artist_name; }
    public void setArtist_name(String artist_name) { this.artist_name = artist_name; }

    @JsonProperty("image_url")
    public String getImage_url() { return image_url; }
    @JsonProperty("image_url")
    public void setImage_url(String image_url) { this.image_url = image_url; }

    // Additional methods
    public double getAverageRating() { return 0; }
    public int getTotalRatings() { return 0; }

}