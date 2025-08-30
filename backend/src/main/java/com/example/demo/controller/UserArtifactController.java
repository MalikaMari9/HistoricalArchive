package com.example.demo.controller;

import com.example.demo.dto.UserArtifactDTO;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.UserArtifactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.demo.entity.ApplicationStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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
    
    @GetMapping("/status")
    public ResponseEntity<String> getArtifactStatus(
            @RequestParam String artifactId,
            @RequestParam Integer userId) {
        Optional<ApplicationStatus> status = userArtifactRepository.findStatusByArtifactIdAndUserId(artifactId, userId);
        return status.map(applicationStatus -> ResponseEntity.ok(applicationStatus.name()))
                   .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public ResponseEntity<UserArtifactDTO> getUserArtifact(
            @RequestParam String artifactId,
            @RequestParam Integer userId) {
        Optional<UserArtifact> userArtifact = userArtifactRepository.findUserArtifactByArtifactIdAndUserId(artifactId, userId);
        
        return userArtifact.map(artifact -> {
            UserArtifactDTO dto = new UserArtifactDTO();
            dto.setUserArtifactId(artifact.getUserArtifactId());
            dto.setArtifactId(artifact.getArtifactId());
            dto.setUserId(artifact.getUserId());
            dto.setStatus(artifact.getStatus().name());
            dto.setSavedAt(artifact.getSavedAt());
            dto.setReason(artifact.getReason());
            dto.setProfessorId(artifact.getProfessorId());
            return ResponseEntity.ok(dto);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{userArtifactId}/status")
    public ResponseEntity<UserArtifactDTO> updateArtifactStatus(
            @PathVariable Integer userArtifactId,
            @RequestParam ApplicationStatus status,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) Integer professorId) {
        
        Optional<UserArtifact> optionalUserArtifact = userArtifactRepository.findById(userArtifactId);
        
        if (optionalUserArtifact.isPresent()) {
            UserArtifact userArtifact = optionalUserArtifact.get();
            userArtifact.setStatus(status);
            if (reason != null) userArtifact.setReason(reason);
            if (professorId != null) userArtifact.setProfessorId(professorId);
            
            UserArtifact updated = userArtifactRepository.save(userArtifact);
            
            UserArtifactDTO dto = new UserArtifactDTO();
            dto.setUserArtifactId(updated.getUserArtifactId());
            dto.setArtifactId(updated.getArtifactId());
            dto.setUserId(updated.getUserId());
            dto.setStatus(updated.getStatus().name());
            dto.setSavedAt(updated.getSavedAt());
            dto.setReason(updated.getReason());
            dto.setProfessorId(updated.getProfessorId());
            
            return ResponseEntity.ok(dto);
        }
        
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{userArtifactId}")
    public ResponseEntity<Void> deleteUserArtifact(@PathVariable Integer userArtifactId) {
        userArtifactRepository.deleteById(userArtifactId);
        return ResponseEntity.noContent().build();
    }
    
 // Add this endpoint to get all user artifacts for an artifact
    @GetMapping("/artifact/{artifactId}")
    public ResponseEntity<List<UserArtifactDTO>> getUserArtifactsByArtifactId(@PathVariable String artifactId) {
        List<UserArtifact> userArtifacts = userArtifactRepository.findByArtifactId(artifactId);
        
        List<UserArtifactDTO> dtos = userArtifacts.stream().map(artifact -> {
            UserArtifactDTO dto = new UserArtifactDTO();
            dto.setUserArtifactId(artifact.getUserArtifactId());
            dto.setArtifactId(artifact.getArtifactId());
            dto.setUserId(artifact.getUserId());
            dto.setStatus(artifact.getStatus().name());
            dto.setSavedAt(artifact.getSavedAt());
            dto.setReason(artifact.getReason());
            dto.setProfessorId(artifact.getProfessorId());
            return dto;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }
    
}