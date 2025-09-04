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

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

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
    public ResponseEntity<Map<String, Object>> getRecentDecisions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null || professor.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        // === Artifact decisions (by this professor) ===
        List<UserArtifact> artifactList = userArtifactRepository.findTopNByStatusesAndProfessorId(
            List.of(ApplicationStatus.accepted, ApplicationStatus.rejected),
            professor.getUserId(),
            PageRequest.of(0, Integer.MAX_VALUE)
        ).getContent();

        List<ReviewDecisionDTO> artifactDecisions = artifactList.stream()
            .map(ua -> {
                Optional<Artifact> artifactOpt = artifactRepository.findById(ua.getArtifactId());
                Optional<User> curatorOpt = userRepository.findById(ua.getUserId());
                if (artifactOpt.isEmpty() || curatorOpt.isEmpty()) return null;

                Instant reviewed = ua.getReviewedAt();
                if (reviewed == null) return null; // skip if not reviewed yet

                return new ReviewDecisionDTO(
                    "artifact",
                    artifactOpt.get().getTitle(),
                    ua.getStatus().name().toLowerCase(),
                    curatorOpt.get().getUsername(),
                    reviewed.atZone(ZoneId.systemDefault()).toLocalDateTime()
                );
            })
            .filter(Objects::nonNull)
            .toList();

        // === Curator application decisions (by this professor) ===
        List<CuratorApplication> reviewedApps = curatorApplicationRepo.findTopNByStatuses(
            List.of(ApplicationStatus.accepted, ApplicationStatus.rejected),
            PageRequest.of(0, Integer.MAX_VALUE)
        );

        List<ReviewDecisionDTO> curatorDecisions = reviewedApps.stream()
            .filter(app -> app.getProfessor() != null && app.getProfessor().getUserId().equals(professor.getUserId()))
            .map(app -> {
                Instant reviewed = app.getReviewedAt();
                if (reviewed == null) return null;

                return new ReviewDecisionDTO(
                    "curator",
                    app.getFname(),
                    app.getApplicationStatus().name().toLowerCase(),
                    app.getUser().getUsername(),
                    reviewed.atZone(ZoneId.systemDefault()).toLocalDateTime()
                );
            })
            .filter(Objects::nonNull)
            .toList();

        // === Combine and sort ===
        List<ReviewDecisionDTO> all = new ArrayList<>();
        all.addAll(artifactDecisions);
        all.addAll(curatorDecisions);
        all.sort((a, b) -> b.getDate().compareTo(a.getDate())); // newest first

        // === Paginate manually ===
        int total = all.size();
        int start = page * size;
        int end = Math.min(start + size, total);
        List<ReviewDecisionDTO> paginated = (start < end) ? all.subList(start, end) : List.of();

        // === Build response ===
        Map<String, Object> response = new HashMap<>();
        response.put("items", paginated);
        response.put("total", total);

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/recent-decisions/filter")
    public ResponseEntity<Map<String, Object>> getFilteredRecentDecisions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "all") String type,
        @RequestParam(defaultValue = "all") String status,
        @RequestParam(required = false) String q,
        HttpSession session
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null || professor.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        String qLower = (q != null) ? q.trim().toLowerCase() : "";
        boolean doSearch = !qLower.isEmpty();

        List<ReviewDecisionDTO> results = new ArrayList<>();
        Integer profId = professor.getUserId();

        // === Artifact Decisions ===
        if (type.equals("all") || type.equals("artifact")) {
            List<UserArtifact> artifactList = userArtifactRepository
                .findTopNByStatusesAndProfessorId(
                    List.of(ApplicationStatus.accepted, ApplicationStatus.rejected),
                    profId,
                    PageRequest.of(0, Integer.MAX_VALUE)
                ).getContent();

            for (UserArtifact ua : artifactList) {
                if (ua.getReviewedAt() == null) continue;

                Optional<Artifact> artifactOpt = artifactRepository.findById(ua.getArtifactId());
                Optional<User> curatorOpt = userRepository.findById(ua.getUserId());

                if (artifactOpt.isEmpty() || curatorOpt.isEmpty()) continue;

                String title = artifactOpt.get().getTitle();
                String curatorUsername = curatorOpt.get().getUsername();
                String statusStr = ua.getStatus().name().toLowerCase(); // accepted / rejected

                if (!status.equals("all") && !status.equalsIgnoreCase(statusStr)) continue;
                if (doSearch && !(title + " " + curatorUsername).toLowerCase().contains(qLower)) continue;

                ReviewDecisionDTO dto = new ReviewDecisionDTO(
                    "artifact",
                    title,
                    statusStr.equals("accepted") ? "approved" : "rejected",
                    curatorUsername,
                    ua.getReviewedAt().atZone(ZoneId.systemDefault()).toLocalDateTime()
                );
                dto.setStatus(statusStr);

                results.add(dto);
            }
        }

        // === Curator Application Decisions ===
        if (type.equals("all") || type.equals("curator")) {
            List<CuratorApplication> apps = curatorApplicationRepo.findTopNByStatuses(
                List.of(ApplicationStatus.accepted, ApplicationStatus.rejected),
                PageRequest.of(0, Integer.MAX_VALUE)
            );

            for (CuratorApplication app : apps) {
                if (app.getReviewedAt() == null) continue;
                if (app.getProfessor() == null || !app.getProfessor().getUserId().equals(profId)) continue;

                String fname = app.getFname();
                String curatorUsername = app.getUser().getUsername();
                String statusStr = app.getApplicationStatus().name().toLowerCase();

                if (!status.equals("all") && !status.equalsIgnoreCase(statusStr)) continue;
                if (doSearch && !(fname + " " + curatorUsername).toLowerCase().contains(qLower)) continue;

                ReviewDecisionDTO dto = new ReviewDecisionDTO(
                    "curator",
                    fname,
                    statusStr.equals("accepted") ? "approved" : "rejected",
                    curatorUsername,
                    app.getReviewedAt().atZone(ZoneId.systemDefault()).toLocalDateTime()
                );
                dto.setStatus(statusStr);

                results.add(dto);
            }
        }

        // Sort by date descending
        results.sort((a, b) -> b.getDate().compareTo(a.getDate()));

        // Paginate manually
        int total = results.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<ReviewDecisionDTO> paginated = results.subList(start, end);

        Map<String, Object> response = new HashMap<>();
        response.put("items", paginated);
        response.put("total", total);

        return ResponseEntity.ok(response);
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

        List<PendingCuratorDTO> dtoList = curatorApplicationRepository
            .findByApplicationStatus(ApplicationStatus.pending)
            .stream()
            .sorted((a, b) -> b.getUser().getCreatedAt().compareTo(a.getUser().getCreatedAt()))
            .limit(5)
            .map(app -> {
                // ✅ Log the email for debugging
                System.out.println("📧 Email for application ID " + app.getApplicationId() + ": " + app.getUser().getEmail());

                return new PendingCuratorDTO(
                    app.getApplicationId(),
                    app.getUser().getUsername(),
                    app.getUser().getEmail(), // <-- this is what you're checking
                    app.getFname(),
                    app.getDob(),
                    app.getEducationalBackground(),
                    app.getCertification(),
                    app.getCertificationPath(),
                    app.getPersonalExperience(),
                    app.getPortfolioLink(),
                    app.getMotivationReason(),
                    app.getUser().getCreatedAt().toLocalDate()
                );
            })
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
    @CrossOrigin(origins = {"http://localhost:3000"}, exposedHeaders = {"X-Total-Count"})
    public ResponseEntity<List<PendingArtifactDTO>> getAllReviewArtifacts(
            @RequestParam(name = "status", required = false) ApplicationStatus status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "6") int size,
            @RequestParam(name = "q", required = false) String q,
            HttpSession session
    ) {
        if (size <= 0) size = 6;
        if (page < 0) page = 0;

        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null || professor.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        // ---- Branch 1: no search term -> keep DB paging (fast path)
        if (q == null || q.isBlank()) {
            Pageable pageable = PageRequest.of(page, size);
            Page<UserArtifact> uaPage;

            if (status == null) {
                uaPage = userArtifactRepository.findAllByOrderBySavedAtDesc(pageable);
            } else if (status == ApplicationStatus.pending) {
                uaPage = userArtifactRepository.findByStatusOrderBySavedAtDesc(status, pageable);
            } else {
                uaPage = userArtifactRepository.findByStatusAndProfessorIdOrderBySavedAtDesc(
                        status, professor.getUserId(), pageable);
            }

            List<PendingArtifactDTO> content = uaPage.getContent().stream()
                    .map(ua -> buildPendingArtifactDTO(ua))
                    .filter(Objects::nonNull)
                    .toList();

            return ResponseEntity.ok()
                    .header("X-Total-Count", String.valueOf(uaPage.getTotalElements()))
                    .body(content);
        }

        // ---- Branch 2: search term present -> filter THEN paginate (correct totals)
        final String qLower = q.toLowerCase();

        // Build base list WITHOUT paging
        List<UserArtifact> baseList;
        if (status == null) {
            // If you don't have this repo method, use findAll() and sort in-memory by savedAt desc
            // baseList = userArtifactRepository.findAll();
            // baseList.sort((a,b) -> b.getSavedAt().compareTo(a.getSavedAt()));
        	  baseList = userArtifactRepository.findAllByOrderBySavedAtDesc(); // preferred if available
        } else if (status == ApplicationStatus.pending) {
            baseList = userArtifactRepository.findByStatusOrderBySavedAtDesc(status);
        } else {
            baseList = userArtifactRepository.findByStatusAndProfessorIdOrderBySavedAtDesc(
                    status, professor.getUserId());
        }

        // Map to DTOs, filtering by title (case-insensitive) BEFORE paginating
        List<PendingArtifactDTO> filtered = baseList.stream()
                .map(ua -> {
                    // Load artifact once, check title match, then build DTO
                    var artifactOpt = artifactRepository.findById(ua.getArtifactId());
                    if (artifactOpt.isEmpty()) return null;
                    var artifact = artifactOpt.get();
                    String title = artifact.getTitle() == null ? "" : artifact.getTitle().toLowerCase();
                    if (!title.contains(qLower)) return null;
                    return buildPendingArtifactDTO(ua, artifact);
                })
                .filter(Objects::nonNull)
                .toList();

        int total = filtered.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<PendingArtifactDTO> pageSlice = filtered.subList(start, end);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .body(pageSlice);
    }

    /** Build DTO (loads curator, and optionally reuses already-fetched artifact). */
    private PendingArtifactDTO buildPendingArtifactDTO(UserArtifact ua) {
        var artifactOpt = artifactRepository.findById(ua.getArtifactId());
        if (artifactOpt.isEmpty()) return null;
        return buildPendingArtifactDTO(ua, artifactOpt.get());
    }

    private PendingArtifactDTO buildPendingArtifactDTO(UserArtifact ua, Artifact artifact) {
        var curatorOpt = userRepository.findById(ua.getUserId());
        if (curatorOpt.isEmpty()) return null;
        User curator = curatorOpt.get();

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
        application.setReviewedAt(Instant.now());
        curatorApplicationRepo.save(application);

        // Promote user to 'curator'
        application.setProfessor(professor);
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
        application.setProfessor(professor);
        application.setApplicationStatus(ApplicationStatus.rejected);
        application.setReviewedAt(Instant.now());
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
        ua.setReviewedAt(Instant.now());
        ua.setReason(comment);
        ua.setProfessorId(professor.getUserId()); 
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
        if (ua.getStatus() != ApplicationStatus.pending && ua.getStatus() != ApplicationStatus.accepted) {
            return ResponseEntity.badRequest().body("Only pending or accepted submissions can be rejected.");
        }


        String reason = body.get("reason");
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Rejection reason is required.");
        }

        ua.setStatus(ApplicationStatus.rejected);
        ua.setReviewedAt(Instant.now());

        ua.setReason(reason);
        ua.setProfessorId(professor.getUserId()); 
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
    public ResponseEntity<Map<String, Long>> getReviewArtifactCounts(HttpSession session) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null) {
            return ResponseEntity.status(401).build();
        }

        long accepted = userArtifactRepository.countByStatusAndProfessorId(ApplicationStatus.accepted, professor.getUserId());
        long rejected = userArtifactRepository.countByStatusAndProfessorId(ApplicationStatus.rejected, professor.getUserId());
        long total = accepted + rejected;

        // Note: pending is global (not filtered by professor)
        long pending = userArtifactRepository.countByStatus(ApplicationStatus.pending);

        return ResponseEntity.ok(Map.of(
            "pending",  pending,        // shared pool
            "accepted", accepted,       // professor-specific
            "rejected", rejected,       // professor-specific
            "total", total              // professor-specific
        ));
    }

    @GetMapping("/review-stats/full")
    public ResponseEntity<Map<String, Object>> getFullReviewStats(HttpSession session) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null || professor.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        Integer professorId = professor.getUserId();

        // === Artifact counts ===
        long artifactAccepted = userArtifactRepository.countByStatusAndProfessorId(ApplicationStatus.accepted, professorId);
        long artifactRejected = userArtifactRepository.countByStatusAndProfessorId(ApplicationStatus.rejected, professorId);
        long artifactPending = userArtifactRepository.countByStatus(ApplicationStatus.pending); // global
        long artifactTotal = artifactAccepted + artifactRejected;

        // === Curator application counts (professor-specific) ===
        long curatorAccepted = curatorApplicationRepo.countByProfessor_UserIdAndApplicationStatus(professorId, ApplicationStatus.accepted);
        long curatorRejected = curatorApplicationRepo.countByProfessor_UserIdAndApplicationStatus(professorId, ApplicationStatus.rejected);
long curatorPending = curatorApplicationRepo.countByApplicationStatus(ApplicationStatus.pending); // global
        long curatorTotal = curatorAccepted + curatorRejected;
        
        
        List<CuratorApplication> acceptedCurators = curatorApplicationRepo
        	    .findByApplicationStatus(ApplicationStatus.accepted)
        	    .stream()
        	    .filter(c -> c.getProfessor() != null && 
        	                 c.getProfessor().getUserId().equals(professorId))
        	    .toList();

        System.out.println("Accepted curator apps reviewed by prof " + professorId + ": " + acceptedCurators.size());
        	acceptedCurators.forEach(c -> System.out.println("AppID: " + c.getApplicationId() + ", fname: " + c.getFname()));


        Map<String, Object> response = new HashMap<>();
        response.put("artifact", Map.of(
            "pending", artifactPending,
            "accepted", artifactAccepted,
            "rejected", artifactRejected,
            "total", artifactTotal
        ));
        response.put("curator", Map.of(
            "pending", curatorPending,
            "accepted", curatorAccepted,
            "rejected", curatorRejected,
            "total", curatorTotal
        ));

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/curator-applications/review")
    @CrossOrigin(origins = {"http://localhost:3000"}, exposedHeaders = {"X-Total-Count"})
    public ResponseEntity<List<CuratorApplication>> getCuratorAppsForReview(
        @RequestParam(required = false) ApplicationStatus status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "6") int size,
        @RequestParam(required = false) String q,
        HttpSession session
    ) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null || user.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        ApplicationStatus s = (status != null) ? status : ApplicationStatus.pending;
        Integer profId = user.getUserId();

        if (q == null || q.isBlank()) {
            // no search → paged directly
            Page<CuratorApplication> result = (s == ApplicationStatus.pending)
                ? curatorApplicationRepo.findByApplicationStatus(s, PageRequest.of(page, size))
                : curatorApplicationRepo.findByApplicationStatusAndProfessor_UserId(s, profId, PageRequest.of(page, size));

            return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .body(result.getContent());
        }

        // search mode → filter manually
        List<CuratorApplication> full = (s == ApplicationStatus.pending)
            ? curatorApplicationRepo.findByApplicationStatus(s)
            : curatorApplicationRepo.findByApplicationStatusAndProfessor_UserId(s, profId);

        String qLower = q.toLowerCase();

        List<CuratorApplication> filtered = full.stream().filter(app -> {
            String combined = (
                safe(app.getFname()) + " " +
                safe(app.getUser() != null ? app.getUser().getUsername() : "") + " " +
                safe(app.getUser() != null ? app.getUser().getEmail() : "") + " " +
                safe(app.getEducationalBackground()) + " " +
                safe(app.getMotivationReason())
            ).toLowerCase();
            return combined.contains(qLower);
        }).toList();

        int total = filtered.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);

        return ResponseEntity.ok()
            .header("X-Total-Count", String.valueOf(total))
            .body(filtered.subList(start, end));
    }

    private static String safe(String str) {
        return (str == null) ? "" : str;
    }
    
 // In your ProfessorDashboardController (same class that has @RequestMapping("/api/professor/dashboard"))
    @GetMapping("/all-artifacts")
    public ResponseEntity<Map<String, Object>> listAllArtifacts(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,                // NEW
            @RequestParam(defaultValue = "all") String status        // NEW: pending|accepted|rejected|all
    ) {
        User professor = (User) session.getAttribute("loggedInUser");
        if (professor == null || !professor.getRole().name().equalsIgnoreCase("professor")) {
            return ResponseEntity.status(403).build();
        }

        // --- Parse status (case-insensitive; "all" means no filter) ---
        ApplicationStatus statusEnum = null;
        if (status != null && !"all".equalsIgnoreCase(status)) {
            for (ApplicationStatus s : ApplicationStatus.values()) {
                if (s.name().equalsIgnoreCase(status)) {
                    statusEnum = s;
                    break;
                }
            }
        }

        // --- Build the candidate UA list according to q + status ---
        List<UserArtifact> uaPool = new ArrayList<>();

        boolean hasQuery = q != null && !q.trim().isEmpty();
        if (hasQuery) {
            String needle = q.trim();

            // 1) match by artifact title
            //    (Make sure ArtifactRepository has: List<Artifact> findByTitleContainingIgnoreCase(String title);)
            List<Artifact> matchedArts = artifactRepository.findByTitleContainingIgnoreCase(needle);
            List<String> matchedArtIds = matchedArts.stream().map(Artifact::getId).toList();

            // 2) match by curator username
            //    (Make sure UserRepository has: List<User> findByUsernameContainingIgnoreCase(String username);)
            List<User> matchedCurators = userRepository.findByUsernameContainingIgnoreCase(needle);
            List<Integer> matchedCuratorIds = matchedCurators.stream().map(User::getUserId).toList();

            // 3) fetch UA by (artifactId IN ...) OR (userId IN ...), with optional status
            if (!matchedArtIds.isEmpty()) {
                if (statusEnum != null) {
                    uaPool.addAll(userArtifactRepository.findByArtifactIdInAndStatus(matchedArtIds, statusEnum));
                } else {
                    uaPool.addAll(userArtifactRepository.findByArtifactIdIn(matchedArtIds));
                }
            }
            if (!matchedCuratorIds.isEmpty()) {
                if (statusEnum != null) {
                    uaPool.addAll(userArtifactRepository.findByUserIdInAndStatus(matchedCuratorIds, statusEnum));
                } else {
                    uaPool.addAll(userArtifactRepository.findByUserIdIn(matchedCuratorIds));
                }
            }

            // de-duplicate by UA id
            Map<Integer, UserArtifact> uniq = new LinkedHashMap<>();
            for (UserArtifact ua : uaPool) uniq.put(ua.getUserArtifactId(), ua);
            uaPool = new ArrayList<>(uniq.values());
        } else {
            // No search term: pull by status (or everything)
            if (statusEnum != null) {
                uaPool = userArtifactRepository.findByStatus(statusEnum);
            } else {
                uaPool = userArtifactRepository.findAll(); // if your repo returns List; else convert Iterable
            }
        }

        // --- keep only UAs whose artifact still exists in Mongo ---
        List<String> allArtIds = uaPool.stream().map(UserArtifact::getArtifactId).toList();
        List<Artifact> existingArts = artifactRepository.findAllById(allArtIds);
        Set<String> validIds = existingArts.stream().map(Artifact::getId).collect(Collectors.toSet());
        uaPool = uaPool.stream().filter(ua -> validIds.contains(ua.getArtifactId())).toList();

        // --- sort (newest first by savedAt) ---
        uaPool = uaPool.stream()
            .sorted(Comparator.comparing(UserArtifact::getSavedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .toList();

        // --- totals BEFORE pagination ---
        long total = uaPool.size();

        // --- manual pagination ---
        int from = Math.max(0, page * size);
        int to = Math.min(from + size, uaPool.size());
        List<UserArtifact> pageSlice = from < to ? uaPool.subList(from, to) : List.of();

        // --- fetch only what we need for the page slice ---
        List<String> sliceArtIds = pageSlice.stream().map(UserArtifact::getArtifactId).toList();
        List<Integer> sliceCuratorIds = pageSlice.stream().map(UserArtifact::getUserId).distinct().toList();
        List<Integer> sliceProfIds = pageSlice.stream().map(UserArtifact::getProfessorId).filter(Objects::nonNull).distinct().toList();

        Map<String, Artifact> artifactMap = artifactRepository.findAllById(sliceArtIds).stream()
                .collect(Collectors.toMap(Artifact::getId, a -> a));
        Map<Integer, User> curatorMap = userRepository.findAllById(sliceCuratorIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        Map<Integer, User> professorMap = userRepository.findAllById(sliceProfIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        // --- build DTOs ---
        List<Map<String, Object>> items = new ArrayList<>();
        for (UserArtifact ua : pageSlice) {
            Artifact art = artifactMap.get(ua.getArtifactId());
            User curator = curatorMap.get(ua.getUserId());
            User assignedProf = ua.getProfessorId() != null ? professorMap.get(ua.getProfessorId()) : null;
            if (art == null || curator == null) continue;

            Map<String, Object> dto = new HashMap<>();
            dto.put("artifactId", art.getId());
            dto.put("title", art.getTitle());
            dto.put("status", ua.getStatus() != null ? ua.getStatus().name().toLowerCase() : "pending");
            dto.put("submissionDate", art.getUploaded_at() != null ? art.getUploaded_at().toString() : "");
            dto.put("curatorId", curator.getUserId());
            dto.put("curatorName", curator.getUsername());
            dto.put("assignedProfessorId", assignedProf != null ? assignedProf.getUserId() : null);
            dto.put("assignedProfessorName", assignedProf != null ? assignedProf.getUsername() : null);
            dto.put("canReview", ua.getProfessorId() != null && ua.getProfessorId().equals(professor.getUserId()));
            items.add(dto);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("total", total); // total across ALL matches (q + status), not just this page
        response.put("page", page);
        response.put("size", size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/curator-email/{applicationId}")
    public ResponseEntity<String> getCuratorEmail(
            @PathVariable Integer applicationId,
            HttpSession session
    ) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null || user.getRole() != UserRole.professor) {
            return ResponseEntity.status(401).build();
        }

        Optional<CuratorApplication> optApp = curatorApplicationRepo.findById(applicationId);
        if (optApp.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CuratorApplication app = optApp.get();
        if (app.getUser() == null || app.getUser().getEmail() == null) {
            return ResponseEntity.status(404).body("Email not available.");
        }

        return ResponseEntity.ok(app.getUser().getEmail());
    }






    
}