package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.CuratorApplication;
import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/professor/dashboard")
public class ProfessorDashboardController {
	
	 @Autowired
	    private CuratorApplicationRepository curatorApplicationRepo;
	 @Autowired
	 private UserArtifactRepository userArtifactRepository;

	 @Autowired
	 private ArtifactRepository artifactRepository;
	 
	 @Autowired
	 private UserRepository userRepository;
	 
	 @Autowired
	    private NotificationRepository notificationRepository;


    
    @GetMapping("/pending-artworks")
    public ResponseEntity<List<PendingArtworkRequest>> getPendingArtworks() {
        List<PendingArtworkRequest> artworks = Arrays.asList(
            new PendingArtworkRequest(1L, "Byzantine Icon", "John Doe", "Religious Art", 
                                    LocalDateTime.now().minusDays(2), "high"),
            new PendingArtworkRequest(2L, "Roman Fresco Fragment", "Jane Smith", "Ancient Art", 
                                    LocalDateTime.now().minusDays(1), "medium"),
            new PendingArtworkRequest(3L, "Medieval Illuminated Manuscript", "Mike Johnson", 
                                    "Medieval", LocalDateTime.now().minusDays(3), "low")
        );
        return ResponseEntity.ok(artworks);
    }
    
    @GetMapping("/recent-decisions") 
    public ResponseEntity<List<ArtworkDecisionRequest>> getRecentDecisions() {
        List<ArtworkDecisionRequest> decisions = Arrays.asList(
            new ArtworkDecisionRequest("Renaissance Portrait", "approved", "Alice Brown", 
                                     LocalDateTime.now().minusDays(1)),
            new ArtworkDecisionRequest("Gothic Sculpture", "rejected", "Bob Wilson", 
                                     LocalDateTime.now().minusDays(2)),
            new ArtworkDecisionRequest("Baroque Painting", "approved", "Carol Davis", 
                                     LocalDateTime.now().minusDays(3))
        );
        return ResponseEntity.ok(decisions);
    }
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Integer>> getProfessorStats() {
        Map<String, Integer> stats = Map.of(
            "pending", 15,
            "approved", 42,
            "rejected", 8,
            "total", 65
        );
        return ResponseEntity.ok(stats);
    }
      
    @GetMapping("/curator-applications")
    public ResponseEntity<List<CuratorApplicationRequest>> getCuratorApplications() {
        List<CuratorApplication> applications = curatorApplicationRepo.findByApplicationStatusOrderBySubmittedAtDesc(ApplicationStatus.pending);

        List<CuratorApplicationRequest> dtoList = applications.stream().map(app -> {
            CuratorApplicationRequest dto = new CuratorApplicationRequest();
            dto.setApplicationId(app.getApplicationId()); 
            dto.setFname(app.getFname());
            dto.setDob(app.getDob());
            dto.setEducationalBackground(app.getEducationalBackground());
            dto.setCertification(app.getCertification());
            dto.setPersonalExperience(app.getPersonalExperience());
            dto.setPortfolioLink(app.getPortfolioLink());
            dto.setMotivationReason(app.getMotivationReason());
            dto.setSubmittedAt(app.getSubmittedAt());
            
            // Extract from linked User entity
            dto.setUsername(app.getUser().getUsername());
            dto.setEmail(app.getUser().getEmail());
            return dto;
        }).toList();

        return ResponseEntity.ok(dtoList);
    }
    
    @Autowired
    private CuratorApplicationRepository curatorApplicationRepository;

    @GetMapping("/pending-curators")
    public ResponseEntity<List<PendingCuratorDTO>> getPendingCuratorApplications() {
      
        List<PendingCuratorDTO> dtoList = curatorApplicationRepository.findByApplicationStatus(ApplicationStatus.pending).stream()
        	    .sorted((a, b) -> b.getUser().getCreatedAt().compareTo(a.getUser().getCreatedAt()))
        	    .limit(5)
        	    .map(app -> new PendingCuratorDTO(
        	        app.getApplicationId(),
        	        app.getUser().getUsername(),
        	        app.getUser().getEmail(),
        	        app.getFname(),
        	        app.getDob(),
        	        app.getEducationalBackground(),
        	        app.getCertification(),
        	        app.getCertificationPath(),
        	        app.getPersonalExperience(),
        	        app.getPortfolioLink(),
        	        app.getMotivationReason(),
        	        app.getUser().getCreatedAt().toLocalDate()
        	    ))
        	    .toList();


        return ResponseEntity.ok(dtoList);
    }
    
    @GetMapping("/pending-artifacts")
    public ResponseEntity<List<PendingArtifactDTO>> getPendingArtifacts() {
        // Step 1: Get latest pending UserArtifact rows (limit 5)
        List<UserArtifact> userArtifacts = userArtifactRepository.findByStatus(ApplicationStatus.pending).stream()
                .sorted((a, b) -> b.getSavedAt().compareTo(a.getSavedAt()))
                .limit(5)
                .toList();

        // Step 2: For each, fetch artifact (Mongo) + user (SQL)
        List<PendingArtifactDTO> dtoList = userArtifacts.stream()
                .map(ua -> {
                    Optional<Artifact> artifactOpt = artifactRepository.findById(ua.getArtifactId());
                    if (artifactOpt.isEmpty()) {
                        return null; // skip if artifact missing
                    }
                    Artifact artifact = artifactOpt.get();

                    Optional<User> curatorOpt = userRepository.findById(ua.getUserId());
                    if (curatorOpt.isEmpty()) {
                        return null; // skip if user missing
                    }
                    User curator = curatorOpt.get();

                    // Step 3: Build DTO with both sources
                    return new PendingArtifactDTO(
                            // --- from Mongo Artifact ---
                            artifact.getId(),
                            artifact.getTitle(),
                            artifact.getDescription(),
                            artifact.getCategory(),
                            artifact.getCulture(),
                            artifact.getDepartment(),
                            artifact.getPeriod(),
                            artifact.getExact_found_date(),
                            artifact.getMedium(),
                            artifact.getDimension(),
                            artifact.getTags(),
                            artifact.getImages(),
                            artifact.getLocation(),
                            artifact.getUploaded_by(),
                            artifact.getUploaded_at(),
                            artifact.getUpdated_at(),
                            artifact.getArtist_name(),
                            artifact.getImage_url(),

                            // --- from UserArtifact ---
                            ua.getUserArtifactId(),
                            ua.getStatus(),
                            ua.getSavedAt(),
                            ua.getReason(),
                            ua.getProfessorId(),

                            // --- from User (curator) ---
                            curator.getUserId(),
                            curator.getUsername(),
                            curator.getEmail(),
                            curator.getProfilePath(),
                            curator.getCreatedAt()
                    );
                })
                .filter(Objects::nonNull)
                .toList();

        return ResponseEntity.ok(dtoList);
    }
    
    
    @GetMapping("/review-artifacts")
    @CrossOrigin(origins = "http://localhost:8081", exposedHeaders = "X-Total-Count") // expose header
    public ResponseEntity<List<PendingArtifactDTO>> getAllReviewArtifacts(
            @RequestParam(name = "status", required = false) ApplicationStatus status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "6") int size
    ) {
        if (size <= 0) size = 6;
        if (page < 0) page = 0;

        Pageable pageable = PageRequest.of(page, size);

        Page<UserArtifact> uaPage = (status == null)
                ? userArtifactRepository.findAllByOrderBySavedAtDesc(pageable)
                : userArtifactRepository.findByStatusOrderBySavedAtDesc(status, pageable);

        List<PendingArtifactDTO> content = uaPage.getContent().stream()
            .map(ua -> {
                var artifactOpt = artifactRepository.findById(ua.getArtifactId());
                if (artifactOpt.isEmpty()) return null;
                var curatorOpt = userRepository.findById(ua.getUserId());
                if (curatorOpt.isEmpty()) return null;

                Artifact artifact = artifactOpt.get();
                User curator = curatorOpt.get();

                return new PendingArtifactDTO(
                    artifact.getId(),
                    artifact.getTitle(),
                    artifact.getDescription(),
                    artifact.getCategory(),
                    artifact.getCulture(),
                    artifact.getDepartment(),
                    artifact.getPeriod(),
                    artifact.getExact_found_date(),
                    artifact.getMedium(),
                    artifact.getDimension(),
                    artifact.getTags(),
                    artifact.getImages(),
                    artifact.getLocation(),
                    artifact.getUploaded_by(),
                    artifact.getUploaded_at(),
                    artifact.getUpdated_at(),
                    artifact.getArtist_name(),
                    artifact.getImage_url(),
                    ua.getUserArtifactId(),
                    ua.getStatus(),
                    ua.getSavedAt(),
                    ua.getReason(),
                    ua.getProfessorId(),
                    curator.getUserId(),
                    curator.getUsername(),
                    curator.getEmail(),
                    curator.getProfilePath(),
                    curator.getCreatedAt()
                );
            })
            .filter(Objects::nonNull)
            .toList();

        return ResponseEntity.ok()
            .header("X-Total-Count", String.valueOf(uaPage.getTotalElements()))
            .body(content);
    }



    
    @GetMapping("/pending")
       public ResponseEntity<Page<PendingCuratorDTO>> getPendingApplications(Pageable pageable) {
        Page<CuratorApplication> pendingApps = curatorApplicationRepository.findByApplicationStatus(
            ApplicationStatus.pending, pageable
        );

        Page<PendingCuratorDTO> dtoPage = pendingApps.map(app -> new PendingCuratorDTO(
            app.getApplicationId(),
            app.getUser().getUsername(),
            app.getUser().getEmail(),
            app.getFname(),
            app.getDob(),
            app.getEducationalBackground(),
            app.getCertification(),
            app.getCertificationPath(), // full path can be constructed in frontend or here
            app.getPersonalExperience(),
            app.getPortfolioLink(),
            app.getMotivationReason(),
            app.getSubmittedAt().atZone(ZoneId.systemDefault()).toLocalDate()

        ));

        return ResponseEntity.ok(dtoPage);
    }
    
    @PostMapping("/applications/{id}/approve")
    public ResponseEntity<String> approveCuratorApplication(
            @PathVariable Integer id,
            HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null) {
            return ResponseEntity.status(401).body("Login required.");
        }

        Optional<CuratorApplication> optionalApp = curatorApplicationRepo.findById(id);
        if (optionalApp.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CuratorApplication application = optionalApp.get();
        if (application.getApplicationStatus() != ApplicationStatus.pending) {
            return ResponseEntity.badRequest().body("Application is not in pending state.");
        }

        // Approve application
        application.setApplicationStatus(ApplicationStatus.accepted);
        curatorApplicationRepo.save(application);

        // Promote user to 'curator'
        User applicant = application.getUser();
        applicant.setRole(UserRole.curator);
        userRepository.save(applicant);

        // Create notification
        Notification noti = new Notification();
        noti.setRecipient(applicant);
        noti.setSource(professor);
        noti.setRelatedId(String.valueOf(application.getApplicationId()));

        noti.setRelatedType("curator_application");
        noti.setNotificationType("CURATOR_APPLICATION_APPROVED");
        noti.setMessage("Your curator application has been approved.");
        noti.setRead(false);
        noti.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(noti);

        return ResponseEntity.ok("Application approved and user promoted to curator.");
    }

    
    @PostMapping("/applications/{id}/reject")
    public ResponseEntity<String> rejectCuratorApplication(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null) {
            return ResponseEntity.status(401).body("Login required.");
        }

        Optional<CuratorApplication> optionalApp = curatorApplicationRepo.findById(id);
        if (optionalApp.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CuratorApplication application = optionalApp.get();
        if (application.getApplicationStatus() != ApplicationStatus.pending) {
            return ResponseEntity.badRequest().body("Application is not in pending state.");
        }

        String reason = body.get("reason");
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Rejection reason is required.");
        }

        // Reject application
        application.setApplicationStatus(ApplicationStatus.rejected);
        application.setRejectionReason(reason);
        curatorApplicationRepo.save(application);

        // Create notification
        Notification noti = new Notification();
        noti.setRecipient(application.getUser());
        noti.setSource(professor);
        noti.setRelatedId(String.valueOf(application.getApplicationId()));

        noti.setRelatedType("curator_application");
        noti.setNotificationType("CURATOR_APPLICATION_REJECTED");
        noti.setMessage("Your curator application has been rejected. Reason: " + reason);
        noti.setRead(false);
        noti.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(noti);

        return ResponseEntity.ok("Application rejected successfully.");
    }


    @PostMapping("/review-artifacts/{submissionId}/accept")
    public ResponseEntity<String> acceptArtifactSubmission(
            @PathVariable Integer submissionId,
            @RequestBody(required = false) Map<String, String> body,
            HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null) {
            return ResponseEntity.status(401).body("Login required.");
        }

        Optional<UserArtifact> optionalUA = userArtifactRepository.findById(submissionId);
        if (optionalUA.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserArtifact ua = optionalUA.get();
        if (ua.getStatus() != ApplicationStatus.pending) {
            return ResponseEntity.badRequest().body("Submission is not in pending state.");
        }

        String comment = body != null ? body.get("comment") : null;

        ua.setStatus(ApplicationStatus.accepted);
        ua.setReason(comment);
        userArtifactRepository.save(ua);

        // Fetch uploader
        User uploader = userRepository.findById(ua.getUserId())
                .orElseThrow(() -> new RuntimeException("Uploader not found"));

        // Create notification
        Notification noti = new Notification();
        noti.setRecipient(uploader);
        noti.setSource(professor);
        noti.setRelatedId(ua.getArtifactId()); // Mongo ID
        noti.setRelatedType("artifact");
        noti.setNotificationType("ARTIFACT_ACCEPTED");
        noti.setMessage("Your artifact submission has been accepted.");
        noti.setRead(false);
        noti.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(noti);

        return ResponseEntity.ok("Artifact submission accepted successfully.");
    }
    
    @PostMapping("/review-artifacts/{submissionId}/reject")
    public ResponseEntity<String> rejectArtifactSubmission(
            @PathVariable Integer submissionId,
            @RequestBody Map<String, String> body,
            HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null) {
            return ResponseEntity.status(401).body("Login required.");
        }

        Optional<UserArtifact> optionalUA = userArtifactRepository.findById(submissionId);
        if (optionalUA.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserArtifact ua = optionalUA.get();
        if (ua.getStatus() != ApplicationStatus.pending) {
            return ResponseEntity.badRequest().body("Submission is not in pending state.");
        }

        String reason = body.get("reason");
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Rejection reason is required.");
        }

        ua.setStatus(ApplicationStatus.rejected);
        ua.setReason(reason);
        userArtifactRepository.save(ua);

        // Fetch uploader
        User uploader = userRepository.findById(ua.getUserId())
                .orElseThrow(() -> new RuntimeException("Uploader not found"));

        // Create notification
        Notification noti = new Notification();
        noti.setRecipient(uploader);
        noti.setSource(professor);
        noti.setRelatedId(ua.getArtifactId()); // Mongo ID
        noti.setRelatedType("artifact");
        noti.setNotificationType("ARTIFACT_REJECTED");
        noti.setMessage("Your artifact submission has been rejected. Reason: " + reason);
        noti.setRead(false);
        noti.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(noti);

        return ResponseEntity.ok("Artifact submission rejected successfully.");
    }
     
    @GetMapping("/review-artifacts/counts")
    public ResponseEntity<Map<String, Long>> getReviewArtifactCounts() {
        long pending  = userArtifactRepository.countByStatus(ApplicationStatus.pending);   // use .PENDING if your enum is uppercased
        long accepted = userArtifactRepository.countByStatus(ApplicationStatus.accepted);  // or ApplicationStatus.ACCEPTED
        long rejected = userArtifactRepository.countByStatus(ApplicationStatus.rejected);  // or ApplicationStatus.REJECTED

        return ResponseEntity.ok(Map.of(
            "pending",  pending,
            "accepted", accepted,
            "rejected", rejected
        ));
    }


    
}