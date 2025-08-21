// src/main/java/com/example/demo/dto/UploadArtifactDTO.java
package com.example.demo.dto;

import com.example.demo.entity.Artifact;
import com.example.demo.entity.Artifact.ArtifactImage;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;

@Data
public class UploadArtifactDTO {
    private String title;
    private String description;
    private String dimension;
    private String category;
    private String tags; // Will be converted to List<String>
    private String culture;
    private String department;
    private String period;
    private LocalDate exactFoundDate;
    private String location;
    private List<MultipartFile> files;
    
    // You might want to add methods to convert to Artifact entity
    public Artifact toArtifact(String uploadedBy) {
        Artifact artifact = new Artifact();
        artifact.setTitle(this.title);
        artifact.setDescription(this.description);
        artifact.setDimension(this.dimension);
        artifact.setCategory(this.category);
        artifact.setTags(List.of(this.tags.split(",")));
        artifact.setCulture(this.culture);
        artifact.setDepartment(this.department);
        artifact.setPeriod(this.period);
        artifact.setExact_found_date(this.exactFoundDate);
        // location needs to be parsed if it's complex
        artifact.setUploaded_by(uploadedBy);
        artifact.setUploaded_at(new Date().toInstant());
        artifact.setUpdated_at(new Date().toInstant());
        return artifact;
    }

	public String getTitle() {
		// TODO Auto-generated method stub
		return null;
	}

	
}