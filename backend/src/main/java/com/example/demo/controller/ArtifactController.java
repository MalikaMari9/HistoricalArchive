package com.example.demo.controller;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
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
import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.BookmarkRepository;
import com.example.demo.repository.CommentRepository;
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
    private CommentRepository commentRepository;
    
    @Autowired 
    private BookmarkRepository bookmarkRepository;
    
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
            @RequestParam(required = false) String locationQuery,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radius,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            Pageable pageable) {

        Page<Artifact> results = artifactService.searchArtifacts(
            anyField, title, category, culture, department, period, medium, artistName, tags, fromDate, toDate,
            locationQuery, latitude, longitude, radius, city, country, pageable
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
            @RequestParam(defaultValue = "6") int size,
            // Add filtering parameters to enable backend filtering
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
            @RequestParam(required = false) String locationQuery,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radius,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country
    ) {
    	System.out.println("🔎 Global search with query: " + search);
    	System.out.println("🔎 Global search with anyField: " + anyField);
    	System.out.println("🔎 Global search with location: " + locationQuery + ", lat: " + latitude + ", lng: " + longitude);
        Pageable pageable = PageRequest.of(page, size);
        
        // Use the detailed search method instead of simple global search to enable filtering
        Page<Artifact> artifactPage = artifactService.searchArtifacts(
            anyField != null ? anyField : search, // Use anyField if provided, otherwise use search
            title, category, culture, department, period, medium, artistName, tags, 
            fromDate, toDate, locationQuery, latitude, longitude, radius, city, country, pageable
        );
        
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
    public ResponseEntity<Page<ArtifactDTO>> getMyArtworks(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status // "accepted", "rejected", "pending"
    ) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return ResponseEntity.status(401).build();

        List<UserArtifact> userArtifacts = userArtifactRepository.findByUserId(user.getUserId());

        // Step 1: Filter based on status
        if (status != null && !status.equalsIgnoreCase("all")) {
            userArtifacts = userArtifacts.stream()
                .filter(ua -> ua.getStatus().name().equalsIgnoreCase(status))
                .toList();
        }

        // Step 2: Fetch relevant artifacts
        List<String> artifactIds = userArtifacts.stream().map(UserArtifact::getArtifactId).toList();
        List<Artifact> artifacts = artifactRepository.findAllById(artifactIds);
        Map<String, UserArtifact> uaMap = userArtifacts.stream()
                .collect(Collectors.toMap(UserArtifact::getArtifactId, ua -> ua));

        // Step 3: Optional search filter
        List<ArtifactDTO> allDto = artifacts.stream()
        	    .filter(artifact -> {
        	        if (search == null || search.trim().isEmpty()) return true;
        	        return artifact.getTitle().toLowerCase().contains(search.toLowerCase());
        	    })
        	    .map(artifact -> {
        	        ArtifactDTO dto = convertToDTO(artifact);
        	        dto.setStatus(uaMap.get(artifact.getId()).getStatus().name());
        	        return dto;
        	    })
        	    .sorted((a1, a2) -> {
        	        Instant t1 = Optional.ofNullable(a1.getUpdated_at()).orElse(a1.getUploaded_at());
        	        Instant t2 = Optional.ofNullable(a2.getUpdated_at()).orElse(a2.getUploaded_at());
        	        return t2.compareTo(t1); // Descending: newest first
        	    })
        	    .toList();


        // Step 4: Manual pagination
        int start = page * size;
        int end = Math.min(start + size, allDto.size());
        List<ArtifactDTO> pageContent = start >= allDto.size() ? List.of() : allDto.subList(start, end);
        Page<ArtifactDTO> resultPage = new PageImpl<>(pageContent, PageRequest.of(page, size), allDto.size());

        return ResponseEntity.ok(resultPage);
    }

    
    @GetMapping("/my-artworks/stats")
    public ResponseEntity<Map<String, Long>> getCuratorArtworkStats(HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return ResponseEntity.status(401).build();

        List<UserArtifact> all = userArtifactRepository.findByUserId(user.getUserId());

        long accepted = all.stream().filter(ua -> ua.getStatus() == ApplicationStatus.accepted).count();
        long pending = all.stream().filter(ua -> ua.getStatus() == ApplicationStatus.pending).count();
        long rejected = all.stream().filter(ua -> ua.getStatus() == ApplicationStatus.rejected).count();

        Map<String, Long> stats = Map.of(
            "total", (long) all.size(),
            "accepted", accepted,
            "pending", pending,
            "rejected", rejected
        );

        return ResponseEntity.ok(stats);
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
    
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteArtifact(@PathVariable String id, HttpSession session) {
        System.out.println("🗑️ Delete request received for artifact ID: " + id);

        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build(); // Unauthorized
        }

        Optional<Artifact> existingArtifactOpt = artifactRepository.findById(id);
        if (existingArtifactOpt.isEmpty()) {
            System.out.println("⛔️ Artifact " + id + " not found.");
            return ResponseEntity.notFound().build();
        }

        Artifact artifact = existingArtifactOpt.get();
        if (!artifact.getUploaded_by().equals(loggedInUser.getUsername())) {
            System.out.println("⛔️ Unauthorized delete attempt by " + loggedInUser.getUsername());
            return ResponseEntity.status(403).build(); // Forbidden
        }

        // ✅ STEP 1: Get all userArtifactIds linked to this artifact
        List<UserArtifact> userArtifacts = userArtifactRepository.findByArtifactId(id);
        List<Integer> userArtifactIds = userArtifacts.stream()
            .map(UserArtifact::getUserArtifactId)
            .toList();

        // ✅ STEP 2: Delete comments
        System.out.println("🧹 Deleting comments...");
        commentRepository.deleteByUserArtifactIds(userArtifactIds);

        // ✅ STEP 3: Delete ratings
        System.out.println("🧹 Deleting ratings...");
        ratingRepository.deleteByUserArtifactIds(userArtifactIds);

        // ✅ STEP 4: Delete bookmarks
        System.out.println("🧹 Deleting bookmarks...");
        bookmarkRepository.deleteByUserArtifactIds(userArtifactIds);

        // ✅ STEP 5: Delete user_artifact entries
        System.out.println("🧹 Deleting user_artifact entries...");
        userArtifactRepository.deleteByArtifactId(id);

        // ✅ STEP 6: Delete the artifact itself
        artifactRepository.deleteById(id);
        System.out.println("✅ Artifact " + id + " and all related records deleted.");

     // ✅ STEP 2: Delete comment reactions
        System.out.println("🧹 Deleting comment reactions...");
        commentRepository.deleteReactionsByUserArtifactIds(userArtifactIds);

        
        return ResponseEntity.noContent().build(); // 204 No Content
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
