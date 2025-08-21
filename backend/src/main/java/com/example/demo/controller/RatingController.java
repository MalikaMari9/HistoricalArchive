package com.example.demo.controller;

import com.example.demo.dto.RatingRequest;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.Rating;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.ArtifactRepository;
import com.example.demo.repository.RatingRepository;
import com.example.demo.repository.UserArtifactRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    @Autowired
    private RatingRepository ratingRepository;

    @Autowired
    private UserArtifactRepository userArtifactRepository;

    // We need to inject the ArtifactRepository to update the Artifact entity
    @Autowired
    private ArtifactRepository artifactRepository;

    @PostMapping
    public ResponseEntity<?> submitRating(
            @Valid @RequestBody RatingRequest ratingRequest,
            HttpSession session) {
        
        try {
            // Validate session and user
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "Authentication required"));
            }

            // Validate input
            if (ratingRequest.getArtifactId() == null || ratingRequest.getRatingValue() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Artifact ID and rating value are required"));
            }

            if (ratingRequest.getRatingValue() < 1 || ratingRequest.getRatingValue() > 5) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Rating must be between 1 and 5"));
            }

            // Find or create UserArtifact relationship
            Optional<UserArtifact> existingUserArtifact =
            	    userArtifactRepository.findByArtifactIdAndUserId(
            	        ratingRequest.getArtifactId(), user.getUserId());
            UserArtifact userArtifact;
            if (existingUserArtifact.isPresent()) {
                userArtifact = existingUserArtifact.get();
            } else {
                UserArtifact newUA = new UserArtifact();
                newUA.setArtifactId(ratingRequest.getArtifactId());
                newUA.setUserId(user.getUserId());
                userArtifact = userArtifactRepository.save(newUA);
            }

            // Check if user already rated this artifact
            Optional<Rating> existingRating = ratingRepository.findByUserIdAndUserArtifact_ArtifactId(
                user.getUserId(), 
                ratingRequest.getArtifactId()
            );

            Rating rating;
            if (existingRating.isPresent()) {
                // Update existing rating
                rating = existingRating.get();
                rating.setRatingValue(ratingRequest.getRatingValue());
                rating.setRatedAt(LocalDateTime.now());
            } else {
                // Create new rating
                rating = new Rating();
                rating.setUserId(user.getUserId());
                rating.setUserArtifact(userArtifact);
                rating.setRatingValue(ratingRequest.getRatingValue());
            }

            ratingRepository.save(rating);

            // Fetch the artifact to be updated
            Optional<Artifact> optionalArtifact = artifactRepository.findById(ratingRequest.getArtifactId());
            if (optionalArtifact.isPresent()) {
                Artifact artifact = optionalArtifact.get();

                // Recalculate average and total ratings
                Double averageRating = ratingRepository.findAverageRatingByArtifactId(ratingRequest.getArtifactId());
                Long totalRatings = ratingRepository.countByArtifactId(ratingRequest.getArtifactId());

                // Update the artifact entity
                artifact.setAverageRating(averageRating);
                artifact.setTotalRatings(totalRatings);
                artifactRepository.save(artifact);
            }


            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("averageRating", optionalArtifact.isPresent() ? optionalArtifact.get().getAverageRating() : 0.0);
            response.put("totalRatings", optionalArtifact.isPresent() ? optionalArtifact.get().getTotalRatings() : 0);
            response.put("userRating", ratingRequest.getRatingValue());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            // Log the exception for debugging
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to submit rating"));
        }
    }

    @DeleteMapping("/{artifactId}")
    public ResponseEntity<?> removeRating(@PathVariable String artifactId, HttpSession session) {
        try {
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "Authentication required"));
            }

            Optional<Rating> existingRating = ratingRepository.findByUserIdAndUserArtifact_ArtifactId(
                    user.getUserId(),
                    artifactId
            );

            if (existingRating.isPresent()) {
                ratingRepository.delete(existingRating.get());

                // Fetch the artifact to be updated
                Optional<Artifact> optionalArtifact = artifactRepository.findById(artifactId);
                if (optionalArtifact.isPresent()) {
                    Artifact artifact = optionalArtifact.get();

                    // Recalculate average and total ratings
                    Double averageRating = ratingRepository.findAverageRatingByArtifactId(artifactId);
                    Long totalRatings = ratingRepository.countByArtifactId(artifactId);

                    // Update the artifact entity
                    artifact.setAverageRating(averageRating);
                    artifact.setTotalRatings(totalRatings);
                    artifactRepository.save(artifact);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Rating removed successfully");
                response.put("averageRating", optionalArtifact.isPresent() ? optionalArtifact.get().getAverageRating() : 0.0);
                response.put("totalRatings", optionalArtifact.isPresent() ? optionalArtifact.get().getTotalRatings() : 0);

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(404)
                        .body(Map.of("error", "Rating not found"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to remove rating"));
        }
    }


    @GetMapping("/artifact/{artifactId}")
    public ResponseEntity<?> getRatingInfo(
            @PathVariable String artifactId,
            HttpSession session) {
        
        try {
            User user = (User) session.getAttribute("loggedInUser");
            
            Double averageRating = ratingRepository.findAverageRatingByArtifactId(artifactId);
            Long totalRatings = ratingRepository.countByArtifactId(artifactId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("averageRating", averageRating != null ? averageRating : 0);
            response.put("totalRatings", totalRatings != null ? totalRatings : 0);
            
            if (user != null) {
                Optional<Rating> userRating = ratingRepository.findByUserIdAndUserArtifact_ArtifactId(
                    user.getUserId(), 
                    artifactId
                );
                userRating.ifPresent(rating -> response.put("userRating", rating.getRatingValue()));
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to fetch rating info"));
        }
    }
}
