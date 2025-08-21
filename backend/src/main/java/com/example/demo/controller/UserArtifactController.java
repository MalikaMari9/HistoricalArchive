package com.example.demo.controller;

import com.example.demo.dto.UserArtifactDTO;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.UserArtifactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.demo.entity.ApplicationStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/user-artifacts")
@CrossOrigin(origins = "http://localhost:3000")
public class UserArtifactController {

    @Autowired
    private UserArtifactRepository userArtifactRepository;

    @PostMapping
    public ResponseEntity<UserArtifactDTO> createUserArtifact(@RequestBody UserArtifactDTO userArtifactDTO) {
        UserArtifact userArtifact = new UserArtifact();
        userArtifact.setArtifactId(userArtifactDTO.getArtifactId());
        userArtifact.setUserId(userArtifactDTO.getUserId());
        userArtifact.setStatus(ApplicationStatus.pending);
        userArtifact.setSavedAt(Instant.now());

        UserArtifact saved = userArtifactRepository.save(userArtifact);

        // Update and return original DTO (or build a new one if you prefer)
        userArtifactDTO.setUserArtifactId(saved.getUserArtifactId());
        userArtifactDTO.setSavedAt(saved.getSavedAt());
        userArtifactDTO.setStatus(saved.getStatus().name());
        
        return ResponseEntity.ok(userArtifactDTO);
    }

    @GetMapping("/exists")
    public ResponseEntity<Boolean> checkIfArtifactSavedByUser(
            @RequestParam String artifactId,
            @RequestParam Integer userId) {
        boolean exists = userArtifactRepository.existsByArtifactIdAndUserId(artifactId, userId);
        return ResponseEntity.ok(exists);
    }

    @DeleteMapping("/{userArtifactId}")
    public ResponseEntity<Void> deleteUserArtifact(@PathVariable Integer userArtifactId) {
        userArtifactRepository.deleteById(userArtifactId);
        return ResponseEntity.noContent().build();
    }
}