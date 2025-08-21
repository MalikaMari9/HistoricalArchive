package com.example.demo.controller;

import com.example.demo.dto.ArtworkRequest;
import com.example.demo.dto.CommentRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/curator")
public class CuratorDashboardController {
    
    @GetMapping("/artworks")
    public ResponseEntity<List<ArtworkRequest>> getCuratorArtworks() {
 
        List<ArtworkRequest> artworks = Arrays.asList(
            new ArtworkRequest(1L, "Renaissance Portrait", "approved", LocalDateTime.now().minusDays(3)),
            new ArtworkRequest(2L, "Medieval Manuscript", "pending", LocalDateTime.now().minusDays(1)),
            new ArtworkRequest(3L, "Baroque Painting", "rejected", LocalDateTime.now().minusDays(2))
        );
        return ResponseEntity.ok(artworks);
    }
    
    
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Integer>> getCuratorStats() {
        Map<String, Integer> stats = Map.of(
            "totalArtworks", 15,
            "pendingArtworks", 3,
            "approvedArtworks", 10,
            "rejectedArtworks", 2
        );
        return ResponseEntity.ok(stats);
    }
}