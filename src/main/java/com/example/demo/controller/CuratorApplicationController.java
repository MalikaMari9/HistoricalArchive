package com.example.demo.controller;

import com.example.demo.entity.*;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Controller

public class CuratorApplicationController {

    @Autowired
    private CuratorApplicationRepository curatorApplicationRepo;

    @Autowired
    private UserRepository userRepository;

    private static final String CERT_UPLOAD_DIR = "uploads/certifications/";

    @GetMapping("/curator/apply")
    public String showApplicationForm(HttpSession session, Model model) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return "redirect:/login";

        Optional<CuratorApplication> existingApp = curatorApplicationRepo.findFirstByUser(user);

        if (existingApp.isPresent()) {
            ApplicationStatus status = existingApp.get().getApplicationStatus();
            if (status == ApplicationStatus.pending) {
                model.addAttribute("warning", "Your application is currently under review and cannot be edited.");
                return "nonReact/curatorStatus";
            } else if (status == ApplicationStatus.accepted) {
                model.addAttribute("info", "You are already a curator.");
                return "nonReact/curatorStatus";
            }
        }

        model.addAttribute("application", new CuratorApplication());
        return "nonReact/curatorApply";
    }

    @PostMapping("/curator/apply")
    public String submitApplication(@ModelAttribute("application") CuratorApplication formApp,
                                    @RequestParam("certificationFile") MultipartFile certFile,
                                    HttpSession session,
                                    Model model) {

        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return "redirect:/login";

        Optional<CuratorApplication> existingApp = curatorApplicationRepo.findFirstByUser(user);

        if (existingApp.isPresent() && existingApp.get().getApplicationStatus() != ApplicationStatus.rejected) {
            model.addAttribute("error", "You have already submitted an application.");
            return "nonReact/curatorStatus";
        }

        String certPath = null;
        if (!certFile.isEmpty()) {
            try {
                Path uploadDir = Paths.get(CERT_UPLOAD_DIR);
                if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);

                String fileName = UUID.randomUUID() + "_" + certFile.getOriginalFilename();
                Path dest = uploadDir.resolve(fileName);
                Files.copy(certFile.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
                certPath = "/" + CERT_UPLOAD_DIR + fileName;
            } catch (IOException e) {
                model.addAttribute("error", "Failed to upload certification.");
                return "nonReact/curatorApply";
            }
        }

        // Save application
        CuratorApplication newApp = new CuratorApplication();
        newApp.setFname(formApp.getFname().trim());
        newApp.setLname(formApp.getLname().trim());
        newApp.setDob(formApp.getDob());
        newApp.setCertification(formApp.getCertification());
        newApp.setCertificationPath(certPath);
        newApp.setApplicationStatus(ApplicationStatus.pending);
        newApp.setUser(user);

        curatorApplicationRepo.save(newApp);
        model.addAttribute("success", "Your application has been submitted.");
        return "nonReact/curatorStatus";
    }
}
