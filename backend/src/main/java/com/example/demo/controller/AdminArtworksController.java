package com.example.demo.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ArtifactDTO;
import com.example.demo.entity.Artifact;
import com.example.demo.repository.ArtifactRepository;

@RestController
@RequestMapping("/api/admin/artworks")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class AdminArtworksController {

    private final ArtifactRepository artifactRepository;

    @Autowired
    public AdminArtworksController(ArtifactRepository artifactRepository) {
        this.artifactRepository = artifactRepository;
    }

    @GetMapping
    public ResponseEntity<Page<ArtifactDTO>> listArtworks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Artifact> artifactPage = artifactRepository.findAll(pageable);
        Page<ArtifactDTO> dtoPage = artifactPage.map(this::convertToDTO);
        return ResponseEntity.ok(dtoPage);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArtifactDTO> getArtwork(@PathVariable("id") String id) {
        Optional<Artifact> artifact = artifactRepository.findById(id);
        return artifact.map(a -> ResponseEntity.ok(convertToDTO(a)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArtwork(@PathVariable("id") String id) {
        if (!artifactRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        artifactRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ArtifactDTO convertToDTO(Artifact artifact) {
        ArtifactDTO dto = new ArtifactDTO();
        dto.set_Id(artifact.getId());
        dto.setTitle(artifact.getTitle());
        dto.setDescription(artifact.getDescription());
        dto.setCategory(artifact.getCategory());
        dto.setCulture(artifact.getCulture());
        dto.setDepartment(artifact.getDepartment());
        dto.setPeriod(artifact.getPeriod());
        dto.setMedium(artifact.getMedium());
        dto.setDimension(artifact.getDimension());
        dto.setTags(artifact.getTags());
        dto.setLocation(artifact.getLocation());
        dto.setUploaded_by(artifact.getUploaded_by());
        dto.setUploaded_at(artifact.getUploaded_at());
        dto.setUpdated_at(artifact.getUpdated_at());
        dto.setImages(artifact.getImages());
        dto.setImage_url(artifact.getImage_url());
        dto.setAverageRating(0);
        dto.setTotalRatings(0);
        return dto;
    }
}


