package com.example.demo.controller;

import java.util.List;
import java.util.Optional;

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
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.UserArtifactRepository;

@RestController
@RequestMapping("/api/admin/artworks")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class AdminArtworksController {

    private final ArtifactRepository artifactRepository;
    private final UserArtifactRepository userArtifactRepository;

    public AdminArtworksController(ArtifactRepository artifactRepository, UserArtifactRepository userArtifactRepository) {
        this.artifactRepository = artifactRepository;
        this.userArtifactRepository = userArtifactRepository;
    }

    @GetMapping
    @CrossOrigin(origins = {"http://localhost:3000"}, exposedHeaders = {"X-Total-Count"})
    public ResponseEntity<List<ArtifactDTO>> listArtworks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status
    ) {
        if (size <= 0) size = 10;
        if (page < 0) page = 0;

        // ---- Branch 1: no search term -> keep DB paging (fast path)
        if (q == null || q.isBlank()) {
            Pageable pageable = PageRequest.of(page, size);
            Page<Artifact> artifactPage;
            
            // If status filter is provided, we need to filter by UserArtifact status
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                // For status filtering, we need to get all artifacts and filter
                List<Artifact> allArtifacts = artifactRepository.findAll();
                List<ArtifactDTO> filteredDTOs = allArtifacts.stream()
                    .map(this::convertToDTO)
                    .filter(dto -> {
                        if ("not_submitted".equalsIgnoreCase(status)) {
                            return "not_submitted".equalsIgnoreCase(dto.getStatus());
                        }
                        return dto.getStatus().equalsIgnoreCase(status);
                    })
                    .toList();
                
                int total = filteredDTOs.size();
                int start = Math.min(page * size, total);
                int end = Math.min(start + size, total);
                List<ArtifactDTO> pageSlice = filteredDTOs.subList(start, end);
                
                return ResponseEntity.ok()
                        .header("X-Total-Count", String.valueOf(total))
                        .body(pageSlice);
            } else {
                // No status filter, use regular pagination
                artifactPage = artifactRepository.findAll(pageable);
                List<ArtifactDTO> content = artifactPage.getContent().stream()
                        .map(this::convertToDTO)
                        .toList();
                
                return ResponseEntity.ok()
                        .header("X-Total-Count", String.valueOf(artifactPage.getTotalElements()))
                        .body(content);
            }
        }

        // ---- Branch 2: search term present -> filter THEN paginate
        final String qLower = q.toLowerCase();
        List<Artifact> allArtifacts = artifactRepository.findAll();
        
        // Filter by search term and status
        List<ArtifactDTO> filteredDTOs = allArtifacts.stream()
                .map(this::convertToDTO)
                .filter(dto -> {
                    // Search filter
                    boolean matchesSearch = dto.getTitle() != null && dto.getTitle().toLowerCase().contains(qLower) ||
                                           dto.getDescription() != null && dto.getDescription().toLowerCase().contains(qLower) ||
                                           dto.getCategory() != null && dto.getCategory().toLowerCase().contains(qLower) ||
                                           dto.getCulture() != null && dto.getCulture().toLowerCase().contains(qLower) ||
                                           dto.getUploaded_by() != null && dto.getUploaded_by().toLowerCase().contains(qLower);
                    
                    if (!matchesSearch) return false;
                    
                    // Status filter
                    if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                        if ("not_submitted".equalsIgnoreCase(status)) {
                            return "not_submitted".equalsIgnoreCase(dto.getStatus());
                        }
                        return dto.getStatus().equalsIgnoreCase(status);
                    }
                    
                    return true;
                })
                .toList();

        int total = filteredDTOs.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<ArtifactDTO> pageSlice = filteredDTOs.subList(start, end);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .body(pageSlice);
    }
    
    @GetMapping("/all")
    public ResponseEntity<List<ArtifactDTO>> listAllArtworks() {
        List<Artifact> allArtifacts = artifactRepository.findAll();
        List<ArtifactDTO> dtoList = allArtifacts.stream()
            .map(this::convertToDTO)
            .toList();
        return ResponseEntity.ok(dtoList);
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
        
        // Get real status from UserArtifact table
        String status = getArtifactStatus(artifact.getId());
        dto.setStatus(status);
        
        dto.setAverageRating(0);
        dto.setTotalRatings(0);
        return dto;
    }
    
    private String getArtifactStatus(String artifactId) {
        // Find the most recent UserArtifact submission for this artifact
        Optional<UserArtifact> latestSubmission = userArtifactRepository
            .findTopByArtifactIdOrderBySavedAtDesc(artifactId);
            
        if (latestSubmission.isPresent()) {
            return latestSubmission.get().getStatus().name();
        }
        
        // If no UserArtifact record exists, default to "not_submitted"
        return "not_submitted";
    }
}


