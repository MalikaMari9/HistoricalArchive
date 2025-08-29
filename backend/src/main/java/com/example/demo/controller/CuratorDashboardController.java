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

        List<Artifact> myArtifacts = artifactRepository.findByUploaded_by(loggedInUser.getUsername());
        List<String> artifactIds = myArtifacts.stream().map(Artifact::getId).toList();
        List<UserArtifact> userArtifacts = userArtifactRepository.findByUserIdAndArtifactIdIn(
                loggedInUser.getUserId(), artifactIds
        );
        Map<String, UserArtifact> userArtifactMap = userArtifacts.stream()
                .collect(Collectors.toMap(UserArtifact::getArtifactId, ua -> ua));

        List<CuratorArtworkItem> allItems = new ArrayList<>();
        for (Artifact artifact : myArtifacts) {
            UserArtifact ua = userArtifactMap.get(artifact.getId());
            String status = getStatus(ua);

            CuratorArtworkItem dto = new CuratorArtworkItem();
            dto.setId(artifact.getId());
            dto.setTitle(artifact.getTitle());
            dto.setStatus(status);
            dto.setSubmissionDate(artifact.getUploaded_at() != null ? artifact.getUploaded_at().toString() : "");
            allItems.add(dto);
        }

        int start = page * size;
        int end = Math.min(start + size, allItems.size());
        List<CuratorArtworkItem> paginatedItems = start >= allItems.size() ? List.of() : allItems.subList(start, end);

        Map<String, Object> response = new HashMap<>();
        response.put("items", paginatedItems);
        response.put("total", allItems.size());
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

        List<Artifact> myArtifacts = artifactRepository.findByUploaded_by(loggedInUser.getUsername());
        List<String> artifactIds = myArtifacts.stream()
                .map(Artifact::getId)
                .toList();

        List<UserArtifact> userArtifacts = userArtifactRepository.findByUserIdAndArtifactIdIn(
                loggedInUser.getUserId(), artifactIds);

        Map<String, UserArtifact> userArtifactMap = userArtifacts.stream()
                .collect(Collectors.toMap(UserArtifact::getArtifactId, ua -> ua));

        long total = myArtifacts.size();
        long accepted = 0, pending = 0, rejected = 0;

        for (Artifact artifact : myArtifacts) {
            String status = getStatus(userArtifactMap.get(artifact.getId()));
            switch (status) {
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

        System.out.println("Stats - Total: " + total + ", accepted: " + accepted + ", Rejected: " + rejected + ", Pending: " + pending);

        return ResponseEntity.ok(stats);
    }
}
