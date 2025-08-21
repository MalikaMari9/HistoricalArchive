package com.example.demo.controller;

import com.example.demo.dto.CuratorApplicationRequest;
import com.example.demo.entity.*;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController

public class CuratorApplicationController {

    @Autowired
    private CuratorApplicationRepository curatorApplicationRepo;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;

    private static final String CERT_UPLOAD_DIR = "uploads/certifications/";

    

    
    @PostMapping("/api/curator/apply")
    public ResponseEntity<?> submitApplication(
            @RequestPart("data") CuratorApplicationRequest dto,
            @RequestPart(value = "certificationFile", required = false) MultipartFile certFile,
            HttpSession session
    ) {
        // 1. Session check
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            // For demo purposes, if no user is in the session, use a default user.
            // This should be replaced with proper authentication in a real application.
            user = userRepository.findById(1).orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body("Login required and demo user not found.");
            }
        }

        // 2. Check for duplicate or pending applications
        Optional<CuratorApplication> existingApp = curatorApplicationRepo.findFirstByUser(user);
        if (existingApp.isPresent() && existingApp.get().getApplicationStatus() != ApplicationStatus.rejected) {
            return ResponseEntity.badRequest().body("You have already submitted an application.");
        }

        // 3. Upload file if present
        String certPath = null;
        if (certFile != null && !certFile.isEmpty()) {
            try {
                Path uploadDir = Paths.get(CERT_UPLOAD_DIR);
                if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);

                String fileName = UUID.randomUUID() + "_" + certFile.getOriginalFilename();
                Path dest = uploadDir.resolve(fileName);
                Files.copy(certFile.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
                certPath = "/" + CERT_UPLOAD_DIR + fileName;
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Failed to upload certification file.");
            }
        }

        // 4. Build and save CuratorApplication
        CuratorApplication newApp = new CuratorApplication();
        newApp.setFname(dto.getFname().trim());
        newApp.setDob(dto.getDob());
        newApp.setEducationalBackground(dto.getEducationalBackground());
        newApp.setCertification(dto.getCertification());
        newApp.setCertificationPath(certPath);
        newApp.setPersonalExperience(dto.getPersonalExperience());
        newApp.setPortfolioLink(dto.getPortfolioLink());
        newApp.setMotivationReason(dto.getMotivationReason());
        newApp.setApplicationStatus(ApplicationStatus.pending);
        newApp.setUser(user);

        curatorApplicationRepo.save(newApp);

        // 5. Notify professors
        List<User> professors = userRepository.findByRole(UserRole.professor);
        for (User prof : professors) {
            Notification noti = new Notification();
            noti.setRecipient(prof);
            noti.setSource(user);
            noti.setRelatedId(String.valueOf(newApp.getApplicationId()));
            noti.setRelatedType("curator_application");
            noti.setNotificationType("CURATOR_APPLICATION_SUBMITTED");
            noti.setMessage(user.getUsername() + " has submitted a curator application.");
            noti.setRead(false);
            noti.setCreatedAt(LocalDateTime.now());

            notificationRepository.save(noti);
        }

        return ResponseEntity.ok("Your application has been submitted.");
    }
    
    
    
}