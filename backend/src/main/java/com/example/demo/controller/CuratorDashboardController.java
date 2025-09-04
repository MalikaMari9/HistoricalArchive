package com.example.demo.controller;

import com.example.demo.dto.CuratorArtworkItem;
import com.example.demo.dto.CuratorStats;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.UserArtifactRepository;

import jakarta.servlet.http.HttpSession;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/curator")
public class CuratorDashboardController {

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private UserArtifactRepository userArtifactRepository;

    // === Helper to safely parse status ===
    private String getStatus(UserArtifact ua) {
        if (ua == null || ua.getStatus() == null) return "pending";
        return ua.getStatus().name().toLowerCase();
    }

    @GetMapping("/artworks")
    public ResponseEntity<Map<String, Object>> listArtworks(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build();
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<UserArtifact> userArtifactPage = userArtifactRepository
                .findByUserIdOrderBySavedAtDesc(loggedInUser.getUserId(), pageable);

        List<String> artifactIds = userArtifactPage.getContent().stream()
                .map(UserArtifact::getArtifactId)
                .toList();

        List<Artifact> artifacts = artifactRepository.findAllById(artifactIds);

     // Create a map of artifactId -> Artifact
     Map<String, Artifact> artifactMap = artifacts.stream()
             .collect(Collectors.toMap(Artifact::getId, a -> a));

     // 🔽 Insert updated logic HERE
     Set<String> validIds = artifacts.stream()
             .map(Artifact::getId)
             .collect(Collectors.toSet());

     List<UserArtifact> validUserArtifacts = userArtifactPage.getContent().stream()
             .filter(ua -> validIds.contains(ua.getArtifactId()))
             .toList();

     List<CuratorArtworkItem> items = new ArrayList<>();
     for (UserArtifact ua : validUserArtifacts) {
         Artifact artifact = artifactMap.get(ua.getArtifactId());
         CuratorArtworkItem dto = new CuratorArtworkItem();
         dto.setId(artifact.getId());
         dto.setTitle(artifact.getTitle());
         dto.setStatus(ua.getStatus().name().toLowerCase());
         dto.setSubmissionDate(artifact.getUploaded_at() != null
                 ? artifact.getUploaded_at().toString()
                 : "");
         items.add(dto);
     }


        Map<String, Object> response = new HashMap<>();
        response.put("items", items);
        response.put("total", userArtifactPage.getTotalElements()); // ← FIX: total count!
        response.put("page", page);
        response.put("size", size);

        return ResponseEntity.ok(response);
    }


    // === Get curator submission stats ===
    @GetMapping("/stats")
    public ResponseEntity<CuratorStats> getStats(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build();
        }

        List<UserArtifact> userArtifacts = userArtifactRepository.findByUserId(loggedInUser.getUserId());

        long total = userArtifacts.size();
        long accepted = 0, pending = 0, rejected = 0;

        for (UserArtifact ua : userArtifacts) {
            if (ua.getStatus() == null) {
                pending++;
                continue;
            }

            switch (ua.getStatus().name().toLowerCase()) {
                case "accepted" -> accepted++;
                case "rejected" -> rejected++;
                default -> pending++;
            }
        }

        CuratorStats stats = new CuratorStats();
        stats.setTotalArtworks(total);
        stats.setPendingArtworks(pending);
        stats.setApprovedArtworks(accepted);
        stats.setRejectedArtworks(rejected);

        return ResponseEntity.ok(stats);
    }
}
