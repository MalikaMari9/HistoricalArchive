package com.example.demo.controller;

import com.example.demo.entity.*;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.ArtifactIdGenerator;

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
@RequestMapping("/api/upload")
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

    @GetMapping("/check-session")
    public ResponseEntity<String> checkSession(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        return ResponseEntity.ok(
                loggedInUser != null ? "Active session for user: " + loggedInUser.getUsername()
                                     : "No active session"
        );
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
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

    private List<Artifact.ArtifactImage> processUploadedImages(
            List<MultipartFile> files, String artifactId, String uploadedBy
    ) throws IOException {

        List<Artifact.ArtifactImage> artifactImages = new ArrayList<>();
        int imageCounter = 1;

        // Ensure folder: uploads/ArtifactImage/<artifactId>/
        Path artifactDir = uploadsDir.resolve(ARTIFACT_IMG_ROOT).resolve(artifactId);
        Files.createDirectories(artifactDir);

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            // sanitize & uniquify file name
            String original = Optional.ofNullable(file.getOriginalFilename()).orElse("file");
            String safeName = original.replaceAll("[^a-zA-Z0-9._-]", "_");
            String ext = safeName.contains(".") ? safeName.substring(safeName.lastIndexOf('.')) : "";
            String filename = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().replace("-", "") + ext;

            // save to disk
            Path filePath = artifactDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // build public URL: http://localhost:8080/uploads/ArtifactImage/<artifactId>/<filename>
            String publicUrl = PUBLIC_UPLOAD_BASE_URL + ARTIFACT_IMG_ROOT + "/" + artifactId + "/" + filename;

            Artifact.ArtifactImage image = new Artifact.ArtifactImage();
            image.setDate(java.time.LocalDate.now().toString());
            image.setCopyright("Uploaded by " + uploadedBy);
            image.setImageid(300000 + imageCounter); // arbitrary sequence (optional)
            // Make idsid stable per artifact + order if you want to drop the counter:
            // image.setIdsid(Math.abs((artifactId + ":" + imageCounter).hashCode()));
            image.setIdsid(imageCounter); // or keep your counter if you prefer
            image.setFormat(file.getContentType());
            image.setDescription(null);
            image.setTechnique(null);
            image.setRenditionnumber("INV" + (190000 + imageCounter));
            image.setDisplayorder(imageCounter);
            image.setBaseimageurl(publicUrl);
            image.setAlttext(null);
            image.setWidth(1024);
            image.setHeight(788);
            image.setPubliccaption(null);
            image.setIiifbaseuri(null);

            artifactImages.add(image);
            imageCounter++;
        }
        return artifactImages;
    }

}
