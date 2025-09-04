package com.example.demo.controller;
import com.example.demo.dto.UserSessionDTO;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpSession;


@RestController
@CrossOrigin(
	    origins = "http://localhost:3000",
	    allowCredentials = "true"
	)
@RequestMapping("/api/profile")
public class ProfileController {
	
	 @Autowired
	    private UserRepository userRepository;


    private static final String UPLOAD_DIR = "uploads/profile-pictures/";
    
    // Initialize upload directory
    static {
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }
    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser"); // FIXED

        if (loggedInUser == null) {
            return ResponseEntity.status(401).build(); // not logged in
        }

        ProfileResponse profile = new ProfileResponse();
        profile.setUsername(loggedInUser.getUsername());
        profile.setEmail(loggedInUser.getEmail());
        profile.setRole(loggedInUser.getRole().name());
      
        profile.setProfilePicture(loggedInUser.getProfilePath()); // or whatever field

        return ResponseEntity.ok(profile);
    }

    
    @GetMapping("/edit")
    public ResponseEntity<ProfileResponse> getProfileForEdit(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build();
        }

        ProfileResponse profile = new ProfileResponse();
        profile.setUsername(loggedInUser.getUsername());
        profile.setEmail(loggedInUser.getEmail());
     
        profile.setRole(loggedInUser.getRole().name());
        profile.setProfilePicture(loggedInUser.getProfilePath());

        return ResponseEntity.ok(profile);
    }

    
//Fix this afterwards

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
        @RequestPart("profile") String profileJson,
        @RequestPart(value = "file", required = false) MultipartFile file,
        HttpSession session
    ) throws IOException {
        User loggedInUser = (User) session.getAttribute("loggedInUser");
        if (loggedInUser == null) {
            return ResponseEntity.status(401).build();
        }

        ObjectMapper mapper = new ObjectMapper();
        ProfileUpdateRequest updateRequest = mapper.readValue(profileJson, ProfileUpdateRequest.class);

        // Update fields
        loggedInUser.setUsername(updateRequest.getUsername().trim());
        loggedInUser.setEmail(updateRequest.getEmail().trim().toLowerCase());
      
        // Process file
        if (file != null && !file.isEmpty()) {
            // Ensure upload directory exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Generate unique filename
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            
            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Set relative path in database
            loggedInUser.setProfilePath("/" + UPLOAD_DIR + fileName);
        } else if (updateRequest.getProfilePicture() != null && updateRequest.getProfilePicture().equals("null")) {
            // Only clear if profilePicture was explicitly set to null (as a string)
            loggedInUser.setProfilePath(null);
        }


        // Save changes
        userRepository.save(loggedInUser);

        // Build response
        ProfileResponse updatedProfile = new ProfileResponse();
        updatedProfile.setUsername(loggedInUser.getUsername());
        updatedProfile.setEmail(loggedInUser.getEmail());
        updatedProfile.setRole(loggedInUser.getRole().name());
        updatedProfile.setProfilePicture(loggedInUser.getProfilePath());

        return ResponseEntity.ok(updatedProfile);
    }
    
    

}