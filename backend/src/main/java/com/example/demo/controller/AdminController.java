package com.example.demo.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ActivityRequest;
import com.example.demo.entity.ApplicationStatus;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.UserRepository;

@RestController
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private UserArtifactRepository userArtifactRepository;

    @Autowired
    private CuratorApplicationRepository curatorApplicationRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    

    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        try {
            long totalUsers = userRepository.count();
            stats.put("totalUsers", totalUsers);
        } catch (Exception e) {
            stats.put("totalUsers", 0L);
        }

        try {
            long totalArtworks = artifactRepository.count();
            stats.put("totalArtworks", totalArtworks);
        } catch (Exception e) {
            // MongoDB might be down
            stats.put("totalArtworks", 0L);
        }

        try {
            long pendingArtworks = userArtifactRepository.countByStatus(ApplicationStatus.pending);
            long approvedArtworks = userArtifactRepository.countByStatus(ApplicationStatus.accepted);
            long rejectedArtworks = userArtifactRepository.countByStatus(ApplicationStatus.rejected);
            stats.put("pendingArtworks", pendingArtworks);
            stats.put("approvedArtworks", approvedArtworks);
            stats.put("rejectedArtworks", rejectedArtworks);
        } catch (Exception e) {
            stats.put("pendingArtworks", 0L);
            stats.put("approvedArtworks", 0L);
            stats.put("rejectedArtworks", 0L);
        }

        try {
            long totalCategories = categoryRepository.count();
            stats.put("totalCategories", totalCategories);
        } catch (Exception e) {
            stats.put("totalCategories", 0L);
        }

        try {
            long totalComments = commentRepository.count();
            stats.put("totalComments", totalComments);
        } catch (Exception e) {
            stats.put("totalComments", 0L);
        }

        try {
            long pendingCuratorApplications = curatorApplicationRepository.countByApplicationStatus(ApplicationStatus.pending);
            stats.put("pendingCuratorApplications", pendingCuratorApplications);
        } catch (Exception e) {
            stats.put("pendingCuratorApplications", 0L);
        }

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/dashboard/activities")
    public ResponseEntity<Page<ActivityRequest>> getRecentActivities(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // Build a comprehensive recent activity feed from real data available
        List<ActivityRequest> allEvents = new java.util.ArrayList<>();
        
        // 1) Latest users
        try {
            userRepository.findAll().stream()
                    .sorted((a, b) -> {
                        var at = a.getCreatedAt();
                        var bt = b.getCreatedAt();
                        if (at == null && bt == null) return 0;
                        if (at == null) return 1;
                        if (bt == null) return -1;
                        return bt.compareTo(at);
                    })
                    .limit(50) // Get more data for pagination
                    .forEach(u -> allEvents.add(new ActivityRequest(
                            u.getUserId().longValue(),
                            "New user registration",
                            u.getUsername() + " joined as " + u.getRole().name(),
                            u.getCreatedAt() != null ? u.getCreatedAt() : LocalDateTime.now()
                    )));
        } catch (Exception ignored) {}

        // 2) Pending artworks (from UserArtifact) as activity
        try {
            userArtifactRepository.findByStatus(com.example.demo.entity.ApplicationStatus.pending).stream()
                    .sorted((a, b) -> b.getSavedAt().compareTo(a.getSavedAt()))
                    .limit(50) // Get more data for pagination
                    .forEach(ua -> allEvents.add(new ActivityRequest(
                            ua.getUserArtifactId().longValue(),
                            "Art submission pending",
                            "Artifact " + ua.getArtifactId() + " awaiting approval",
                            java.time.LocalDateTime.ofInstant(ua.getSavedAt(), java.time.ZoneId.systemDefault())
                    )));
        } catch (Exception ignored) {}

        // 3) Approved artworks as activity
        try {
            userArtifactRepository.findByStatus(com.example.demo.entity.ApplicationStatus.accepted).stream()
                    .sorted((a, b) -> b.getSavedAt().compareTo(a.getSavedAt()))
                    .limit(50) // Get more data for pagination
                    .forEach(ua -> allEvents.add(new ActivityRequest(
                            ua.getUserArtifactId().longValue(),
                            "Art submission approved",
                            "Artifact " + ua.getArtifactId() + " has been approved",
                            java.time.LocalDateTime.ofInstant(ua.getSavedAt(), java.time.ZoneId.systemDefault())
                    )));
        } catch (Exception ignored) {}

        // 4) Categories recently created
        try {
            categoryRepository.findAll().stream()
                    .sorted((a, b) -> {
                        var at = a.getCreatedAt();
                        var bt = b.getCreatedAt();
                        if (at == null && bt == null) return 0;
                        if (at == null) return 1;
                        if (bt == null) return -1;
                        return bt.compareTo(at);
                    })
                    .limit(20) // Get more data for pagination
                    .forEach(c -> allEvents.add(new ActivityRequest(
                            c.getCategoryId() != null ? c.getCategoryId().longValue() : 0L,
                            "Category created",
                            c.getName(),
                            c.getCreatedAt() != null ? c.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime() : LocalDateTime.now()
                    )));
        } catch (Exception ignored) {}

        // Sort all events by timestamp desc
        allEvents.sort((e1, e2) -> e2.getTimestamp().compareTo(e1.getTimestamp()));

        // Apply pagination
        Pageable pageable = PageRequest.of(page, size);
        int totalElements = allEvents.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + size, totalElements);
        
        List<ActivityRequest> pageContent = start < totalElements ? 
            allEvents.subList(start, end) : new java.util.ArrayList<>();
        
        Page<ActivityRequest> pageResult = new PageImpl<>(pageContent, pageable, totalElements);
        return ResponseEntity.ok(pageResult);
    }
}
