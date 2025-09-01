package com.example.demo.controller;

import com.example.demo.entity.*;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.ArtifactIdGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
// include 8081 because professor dashboard calls from there
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8081"}, allowCredentials = "true")
@RequiredArgsConstructor
public class CuratorUploadController {

	

	
	@Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserArtifactRepository userArtifactRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EntityManager entityManager; 


    private final Path uploadsDir = Paths.get("uploads");
   
	private static final String ARTIFACT_IMG_ROOT = "ArtifactImage";
	private static final String PUBLIC_UPLOAD_BASE_URL = "http://localhost:8080/uploads/";
    // NOTE: counters are risky across restarts; consider a proper sequence/UUID
    private final AtomicInteger artifactIdCounter = new AtomicInteger(1);
    private final AtomicInteger idsidCounter = new AtomicInteger(1);

    @PostConstruct
    public void init() throws IOException {
        if (!Files.exists(uploadsDir)) {
            Files.createDirectories(uploadsDir);
        }
        Integer maxId = artifactRepository.findMaxArtifactIdNumber();
        if (maxId != null) {
            artifactIdCounter.set(maxId + 1);
        }
    }

    @GetMapping("/upload/check-session")
    public ResponseEntity<String> checkSession(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        return ResponseEntity.ok(
                loggedInUser != null ? "Active session for user: " + loggedInUser.getUsername()
                                     : "No active session"
        );
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional // JPA only; Mongo is not part of this TX
    public ResponseEntity<Artifact> uploadArtifact(
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "dimension", required = false) String dimension,
            @RequestParam("category") String category,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "culture", required = false) String culture,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "exact_found_date", required = false) LocalDate exactFoundDate,
            @RequestParam(value = "medium", required = false) String medium,
            @RequestParam(value = "artistName", required = false) String artistName,
            @RequestParam(value = "location", required = false) String locationJson,

            @RequestParam("files") List<MultipartFile> files,
            HttpSession session
    ) throws IOException {

        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build();
        }
        
 


        // 1) Create + save Artifact (Mongo)
        Artifact artifact = createArtifact(
                title, description, dimension, category, tags,
                culture, department, period, exactFoundDate,
                medium,
                (artistName != null && !artistName.isBlank()) ? artistName : loggedInUser.getUsername(), // use provided artist name if given
                files,
                loggedInUser
        );
        
        if (locationJson != null && !locationJson.isBlank()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                LocationInfo location = mapper.readValue(locationJson, LocationInfo.class);
                artifact.setLocation(location);
            } catch (Exception e) {
                System.err.println("Failed to parse location JSON: " + e.getMessage());
            }
        }
        
        Artifact savedArtifact = artifactRepository.save(artifact);

        // 2) Create + save UserArtifact (Postgres)
        UserArtifact ua = userArtifactRepository
        	    .findTopByArtifactIdAndUserIdOrderBySavedAtDesc(savedArtifact.getId(), loggedInUser.getUserId())
        	    .orElseGet(UserArtifact::new);

        boolean isNew = (ua.getUserArtifactId() == null);
        ApplicationStatus previous = ua.getStatus();
        
        ua.setArtifactId(savedArtifact.getId());
        ua.setUserId(loggedInUser.getUserId());
        ua.setSavedAt(Instant.now());
        ua.setStatus(ApplicationStatus.pending);
        ua.setReason(null);
        ua.setProfessorId(null);

        UserArtifact savedUA = userArtifactRepository.save(ua);

     // 3) Notify professors (only if new OR status changed from something else)
     boolean shouldNotify = isNew || previous != ApplicationStatus.pending;
     if (shouldNotify) {
         List<User> professors = userRepository.findByRole(UserRole.professor);
         if (!professors.isEmpty()) {
             List<Notification> batch = new ArrayList<>(professors.size());
             for (User prof : professors) {
                 Notification n = new Notification();
                 n.setRecipient(prof);
                 n.setSource(loggedInUser);
                 n.setRelatedId(String.valueOf(savedUA.getUserArtifactId())); // submission id
                 n.setRelatedType("artifact_submission");
                 n.setNotificationType(isNew ? "ARTIFACT_SUBMITTED" : "ARTIFACT_RESUBMITTED");
                 n.setMessage(loggedInUser.getUsername() + (isNew ? " submitted" : " resubmitted") + " an artifact for review.");
                 n.setRead(false);
                 n.setCreatedAt(LocalDateTime.now());
                 batch.add(n);
             }
             notificationRepository.saveAll(batch);
         }
     }

        return ResponseEntity.ok(savedArtifact);
    }

    private Artifact createArtifact(
            String title, String description, String dimension,
            String category, String tags, String culture,
            String department, String period, LocalDate exactFoundDate,
            String medium, String artistName, List<MultipartFile> files,
            User loggedInUser
    ) throws IOException {

        Artifact artifact = new Artifact();

        // Custom id (consider replacing with a proper sequence or UUID)
        artifact.setId(ArtifactIdGenerator.newArtifactId());

        Instant now = Instant.now();
        artifact.setUploaded_at(now);
        artifact.setUpdated_at(now);

        artifact.setArtist_name(artistName);
        artifact.setUploaded_by(loggedInUser.getUsername());

        artifact.setTitle(title);
        artifact.setDescription(description);
        artifact.setCategory(category);
        artifact.setCulture(culture);
        artifact.setDepartment(department);
        artifact.setPeriod(period);
        artifact.setExact_found_date(exactFoundDate);
        artifact.setMedium(medium);
        artifact.setDimension(dimension);

        // normalize tags -> List<String>
        if (tags != null && !tags.isBlank()) {
            List<String> normalized = Arrays.stream(tags.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            artifact.setTags(normalized.isEmpty() ? null : normalized);
        } else {
            artifact.setTags(null);
        }

        artifact.setLocation(new LocationInfo());
        // prefer images[] over single image_url
        artifact.setImage_url(null);

        // Process images
     // ✅ pass the generated artifact ID
        artifact.setImages(processUploadedImages(files, artifact.getId(), loggedInUser.getUsername()));

        return artifact;
    }

   
    
    @PutMapping(path = "/update-artifact/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> updateArtifactMultipart(
            @PathVariable String id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam(value = "culture", required = false) String culture,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "medium", required = false) String medium,
            @RequestParam(value = "dimension", required = false) String dimension,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "location", required = false) String locationJson,
            @RequestParam(value = "exact_found_date", required = false) String foundDateStr,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "deleteImages", required = false) List<String> deleteImageKeys,
            HttpSession session
    ) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return ResponseEntity.status(401).body("Unauthorized");

        Optional<Artifact> artifactOpt = artifactRepository.findById(id);
        if (artifactOpt.isEmpty()) return ResponseEntity.status(404).body("Artifact not found");

        Artifact artifact = artifactOpt.get();

        if (!artifact.getUploaded_by().equals(user.getUsername())) {
            return ResponseEntity.status(403).body("Forbidden: Not your artifact");
        }

        try {
            // Basic fields
            artifact.setTitle(title);
            artifact.setDescription(description);
            artifact.setCategory(category);
            artifact.setCulture(culture);
            artifact.setDepartment(department);
            artifact.setPeriod(period);
            artifact.setMedium(medium);
            artifact.setDimension(dimension);
            artifact.setUpdated_at(Instant.now());

            // Tags
            if (tags != null && !tags.isBlank()) {
                List<String> tagList = Arrays.stream(tags.split(","))
                        .map(String::trim).filter(s -> !s.isEmpty()).toList();
                artifact.setTags(tagList);
            } else {
                artifact.setTags(null);
            }

            // Location
            if (locationJson != null && !locationJson.isBlank()) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    LocationInfo loc = mapper.readValue(locationJson, LocationInfo.class);
                    artifact.setLocation(loc);
                } catch (Exception e) {
                    System.err.println("Failed to parse location JSON: " + e.getMessage());
                }
            }

            // Found Date (allow clearing)
            if (foundDateStr != null && !foundDateStr.isBlank()) {
                artifact.setExact_found_date(LocalDate.parse(foundDateStr));
            } else {
                artifact.setExact_found_date(null);
            }

            // Current images list (null-safe copy)
            List<Artifact.ArtifactImage> currentImages =
                    new ArrayList<>(Optional.ofNullable(artifact.getImages()).orElse(Collections.emptyList()));

            // Handle deletions (including legacy image_url)
            if (deleteImageKeys != null && !deleteImageKeys.isEmpty()) {
                Set<String> toDelete = new HashSet<>(deleteImageKeys);

                if (toDelete.contains("image_url")) {
                    artifact.setImage_url(null); // clear fallback image URL
                    toDelete.remove("image_url");
                }

                if (!toDelete.isEmpty() && !currentImages.isEmpty()) {
                    currentImages = currentImages.stream()
                            .filter(img -> {
                                String key = String.valueOf(
                                        img.getImageid() != null ? img.getImageid() : img.getRenditionnumber()
                                );
                                return !toDelete.contains(key);
                            })
                            .collect(Collectors.toList());
                }
            }

            // Add new images with continued display order, cap total at 5
            if (files != null && !files.isEmpty()) {
                int remaining = currentImages.size();
                int canAdd = Math.max(0, 5 - remaining); // enforce cap
                if (canAdd > 0) {
                    List<MultipartFile> toAdd = files.size() > canAdd ? files.subList(0, canAdd) : files;

                    int nextStart = currentImages.stream()
                            .map(img -> img.getDisplayorder() == null ? 0 : img.getDisplayorder())
                            .max(Integer::compareTo).orElse(0) + 1;

                    List<Artifact.ArtifactImage> newImages =
                            processUploadedImages(toAdd, artifact.getId(), user.getUsername(), nextStart);

                    currentImages.addAll(newImages);
                }
            }

            // Require at least one image overall
            if (currentImages.isEmpty()
                    && (artifact.getImage_url() == null || artifact.getImage_url().isBlank())) {
                return ResponseEntity.badRequest().body("At least one image is required");
            }

            artifact.setImages(currentImages);

            Artifact saved = artifactRepository.save(artifact);
            
         // Handle UserArtifact resubmission
            UserArtifact ua = userArtifactRepository
                    .findTopByArtifactIdAndUserIdOrderBySavedAtDesc(artifact.getId(), user.getUserId())
                    .orElse(null);

            if (ua != null && ua.getStatus() != ApplicationStatus.pending) {
                ua.setStatus(ApplicationStatus.pending);
                ua.setSavedAt(Instant.now());
                ua.setReason(null);
                ua.setProfessorId(null);
                ua.setLastUpdatedAt(Instant.now());


                userArtifactRepository.save(ua);

                // Notify professors
                List<User> professors = userRepository.findByRole(UserRole.professor);
                if (!professors.isEmpty()) {
                    List<Notification> batch = new ArrayList<>(professors.size());
                    for (User prof : professors) {
                        Notification n = new Notification();
                        n.setRecipient(prof);
                        n.setSource(user);
                        n.setRelatedId(String.valueOf(ua.getUserArtifactId()));
                        n.setRelatedType("artifact_submission");
                        n.setNotificationType("ARTIFACT_RESUBMITTED");
                        n.setMessage(user.getUsername() + " resubmitted an updated artifact for review.");
                        n.setRead(false);
                        n.setCreatedAt(LocalDateTime.now());
                        batch.add(n);
                    }
                    notificationRepository.saveAll(batch);
                }
            }

            
            return ResponseEntity.ok(Map.of("id", saved.getId()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Update failed: " + e.getMessage());
        }
    }
    
    private List<Artifact.ArtifactImage> processUploadedImages(
            List<MultipartFile> files, String artifactId, String uploadedBy
    ) throws IOException {
        return processUploadedImages(files, artifactId, uploadedBy, 1);
    }

    private List<Artifact.ArtifactImage> processUploadedImages(
            List<MultipartFile> files, String artifactId, String uploadedBy, int startIndex
    ) throws IOException {

        List<Artifact.ArtifactImage> artifactImages = new ArrayList<>();

        Path artifactDir = uploadsDir.resolve(ARTIFACT_IMG_ROOT).resolve(artifactId);
        Files.createDirectories(artifactDir);

        int imageCounter = Math.max(1, startIndex);

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;

            // basic backend validation
            if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                throw new IllegalArgumentException("Only image files are allowed");
            }
            if (file.getSize() > 10 * 1024 * 1024) {
                throw new IllegalArgumentException("File exceeds 10MB limit");
            }

            String original = Optional.ofNullable(file.getOriginalFilename()).orElse("file");
            String safeName = original.replaceAll("[^a-zA-Z0-9._-]", "_");
            String ext = safeName.contains(".") ? safeName.substring(safeName.lastIndexOf('.')) : "";
            String filename = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().replace("-", "") + ext;

            Path filePath = artifactDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String publicUrl = PUBLIC_UPLOAD_BASE_URL + ARTIFACT_IMG_ROOT + "/" + artifactId + "/" + filename;

            Artifact.ArtifactImage image = new Artifact.ArtifactImage();
            image.setDate(java.time.LocalDate.now().toString());
            image.setCopyright("Uploaded by " + uploadedBy);
            image.setImageid(300000 + imageCounter);
            image.setIdsid(imageCounter);
            image.setFormat(file.getContentType());
            image.setRenditionnumber("INV" + (190000 + imageCounter));
            image.setDisplayorder(imageCounter);
            image.setBaseimageurl(publicUrl);
            image.setWidth(1024);
            image.setHeight(788);

            artifactImages.add(image);
            imageCounter++;
        }
        return artifactImages;
    }




}
