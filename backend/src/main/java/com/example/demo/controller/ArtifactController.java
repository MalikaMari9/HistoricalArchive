package com.example.demo.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ArtifactDTO;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.RatingRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.service.ArtifactService;
import com.example.demo.service.ArtifactServiceImpl;

import jakarta.servlet.http.HttpSession;



@RestController
@RequestMapping("/api/artifacts")
@CrossOrigin(origins = "http://localhost:3000")
public class ArtifactController {

    private final ArtifactRepository artifactRepository;
    
    @Autowired
    private ArtifactServiceImpl artifactServiceImpl;
    
    @Autowired
    private ArtifactService artifactService;
    
    @Autowired
    private RatingRepository ratingRepository;

    @Autowired 
    private UserArtifactRepository userArtifactRepository;
    
    @Autowired
    public ArtifactController(ArtifactRepository artifactRepository) {
        this.artifactRepository = artifactRepository;
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Artifact>> searchArtifacts(
            @RequestParam(required = false) String anyField,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String culture,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String medium,
            @RequestParam(required = false) String artistName,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            Pageable pageable) {

        Page<Artifact> results = artifactService.searchArtifacts(
            anyField, title, category, culture, department, period, medium, artistName, tags, fromDate, toDate, pageable
        );
        System.out.println("🔎 Search Results:");
        System.out.println("  Total Elements: " + results.getTotalElements());
        for (Artifact artifact : results.getContent()) {
            System.out.println("  - ID: " + artifact.getId() + " | Title: " + artifact.getTitle());
        }

        return ResponseEntity.ok(results);
     
    }
    
    @GetMapping
    public Page<ArtifactDTO> globalSearchArtifacts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size
    ) {
    	System.out.println("Global search query: " + search);
        Pageable pageable = PageRequest.of(page, size);
        Page<Artifact> artifactPage = artifactService.globalSearch(search, pageable);
        
        System.out.println("Total results: " + artifactPage.getTotalElements());
        for (Artifact artifact : artifactPage.getContent()) {
            System.out.println(" - ID: " + artifact.getId() + " | Title: " + artifact.getTitle());
        }

        
        return artifactPage.map(this::convertToDTO);
    }


    
   
    @GetMapping("/{id:[a-zA-Z]_[0-9A-Za-z]+}")
    public ResponseEntity<Artifact> getArtifactById(@PathVariable String id) {
        return artifactRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    
    
 // Updated suggestion endpoints to use service methods
    @GetMapping("/suggestions/categories")
    public ResponseEntity<List<String>> getCategorySuggestions() {
        try {
            List<String> categories = artifactServiceImpl.getDistinctCategories();
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            System.err.println("Error fetching category suggestions: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    @GetMapping("/suggestions/periods")
    public ResponseEntity<List<String>> getPeriodSuggestions() {
        try {
            List<String> periods = artifactServiceImpl.getDistinctPeriods();
            return ResponseEntity.ok(periods);
        } catch (Exception e) {
            System.err.println("Error fetching period suggestions: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    @GetMapping("/suggestions/cultures")
    public ResponseEntity<List<String>> getCultureSuggestions() {
        try {
            List<String> cultures = artifactServiceImpl.getDistinctCultures();
            return ResponseEntity.ok(cultures);
        } catch (Exception e) {
            System.err.println("Error fetching culture suggestions: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    @GetMapping("/suggestions/departments")
    public ResponseEntity<List<String>> getDepartmentSuggestions() {
        try {
            List<String> departments = artifactServiceImpl.getDistinctDepartments();
            return ResponseEntity.ok(departments);
        } catch (Exception e) {
            System.err.println("Error fetching department suggestions: " + e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    private ArtifactDTO convertToDTO(Artifact artifact) {
    	
    	
    	
        ArtifactDTO dto = new ArtifactDTO();
        dto.set_Id(artifact.getId()); // Custom h_/a_ ID
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
        Double avg = ratingRepository.findAverageRatingByArtifactId(artifact.getId());
        Long count = ratingRepository.countByArtifactId(artifact.getId());
        // Default ratings
        dto.setAverageRating(avg != null ? avg : 0.0);
        dto.setTotalRatings(count != null ? count.intValue() : 0);
        
        return dto;
        
        
    }
    
    // Curator View Artwork


    @GetMapping("/my-artworks")
    @CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
    public ResponseEntity<Page<ArtifactDTO>> getMyArtworks(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {

        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) return ResponseEntity.status(401).body(null);

        Pageable pageable = PageRequest.of(page, size);
        Page<Artifact> artifactPage = artifactRepository.findByUploaded_by(loggedInUser.getUsername(), pageable);

        Page<ArtifactDTO> dtoPage = artifactPage.map(a -> {
            ArtifactDTO dto = convertToDTO(a); // already sets ratings/images/etc.
            UserArtifact ua = userArtifactRepository.findByUserIdAndArtifactId(loggedInUser.getUserId(), a.getId());
            if (ua != null && ua.getStatus() != null) {
                dto.setStatus(ua.getStatus().name());
            } else {
                dto.setStatus("pending"); // sensible default
            }
            return dto;
        });

        return ResponseEntity.ok(dtoPage);
    }

    
    //Update artifact
    @PutMapping("/{id}")
    public ResponseEntity<Artifact> updateArtifact(@PathVariable String id, @RequestBody Artifact updatedArtifact, HttpSession session) {
        System.out.println("✏️ Update request received for artifact ID: " + id);
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build(); // 401 Unauthorized
        }

        Optional<Artifact> existingArtifactOpt = artifactRepository.findById(id);
        if (existingArtifactOpt.isPresent()) {
            Artifact existingArtifact = existingArtifactOpt.get();
            
            // SECURITY CHECK: Ensure the logged-in user owns this artifact
            if (!existingArtifact.getUploaded_by().equals(loggedInUser.getUsername())) {
                System.out.println("⛔️ Unauthorized attempt to update artifact " + id + " by user " + loggedInUser.getUsername());
                return ResponseEntity.status(403).build(); // 403 Forbidden
            }

            // Update fields from the request body
            existingArtifact.setTitle(updatedArtifact.getTitle());
            existingArtifact.setDescription(updatedArtifact.getDescription());
            existingArtifact.setCategory(updatedArtifact.getCategory());
            existingArtifact.setCulture(updatedArtifact.getCulture());
            existingArtifact.setDepartment(updatedArtifact.getDepartment());
            existingArtifact.setPeriod(updatedArtifact.getPeriod());
            existingArtifact.setMedium(updatedArtifact.getMedium());
            existingArtifact.setDimension(updatedArtifact.getDimension());
            existingArtifact.setImage_url(updatedArtifact.getImage_url());
            existingArtifact.setUpdated_at(Instant.now());  // Update timestamp
            
            Artifact savedArtifact = artifactRepository.save(existingArtifact);
            System.out.println("✅ Artifact " + id + " updated successfully.");
            return ResponseEntity.ok(savedArtifact); 
        } else {
            System.out.println("⛔️ Artifact " + id + " not found for update.");
            return ResponseEntity.notFound().build();
        }
    }
    
    // MODIFIED: Added security check
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArtifact(@PathVariable String id, HttpSession session) {
        System.out.println("🗑️ Delete request received for artifact ID: " + id);
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build(); // 401 Unauthorized
        }

        Optional<Artifact> existingArtifactOpt = artifactRepository.findById(id);
        if (existingArtifactOpt.isPresent()) {
            Artifact existingArtifact = existingArtifactOpt.get();

            // SECURITY CHECK: Ensure the logged-in user owns this artifact
            if (!existingArtifact.getUploaded_by().equals(loggedInUser.getUsername())) {
                System.out.println("⛔️ Unauthorized attempt to delete artifact " + id + " by user " + loggedInUser.getUsername());
                return ResponseEntity.status(403).build(); // 403 Forbidden
            }

            artifactRepository.deleteById(id);
            System.out.println("✅ Artifact " + id + " deleted successfully.");
            return ResponseEntity.noContent().build();
        } else {
            System.out.println("⛔️ Artifact " + id + " not found for deletion.");
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/top-rated")
    public ResponseEntity<List<ArtifactDTO>> getTopRatedArtifacts() {
        try {
            // 1. Get top 3 rated artifact IDs and their average ratings from the PostgreSQL database
            List<Object[]> topRatedData = ratingRepository.findTopRatedArtifacts();
    
            // 2. Extract artifact IDs
            List<String> topRatedArtifactIds = topRatedData.stream()
                    .map(result -> (String) result[0])
                    .collect(Collectors.toList());
    
            // 3. Fetch full artifact details from MongoDB using the IDs
            List<Artifact> topRatedArtifacts = artifactRepository.findByIdsIn(topRatedArtifactIds);
    
            // 4. Combine data and convert to DTOs
            List<ArtifactDTO> topRatedDTOs = topRatedArtifacts.stream()
                    .map(artifact -> {
                        ArtifactDTO dto = convertToDTO(artifact);
                        // Find the corresponding average rating from the PostgreSQL results
                        Optional<Object[]> ratingEntry = topRatedData.stream()
                                .filter(entry -> ((String) entry[0]).equals(artifact.getId()))
                                .findFirst();
                        if (ratingEntry.isPresent()) {
                            dto.setAverageRating((Double) ratingEntry.get()[1]);
                        }
                        return dto;
                    })
                    .collect(Collectors.toList());
    
            return ResponseEntity.ok(topRatedDTOs);
        } catch (Exception e) {
            // Log the exception for debugging
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }
}
