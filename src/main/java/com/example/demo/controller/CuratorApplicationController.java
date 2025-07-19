package com.example.demo.controller;

import com.example.demo.entity.*;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.NotificationRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Controller

public class CuratorApplicationController {

    @Autowired
    private CuratorApplicationRepository curatorApplicationRepo;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;

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
        
     // Fetch all professors
        List<User> professors = userRepository.findByRole(UserRole.professor);

        // Create notifications
        // We might need to fix this in the future, as of now if there are 50 professors all 50 fof them will receive the notifications
        for (User professor : professors) {
            Notification noti = new Notification();
            noti.setRecipient(professor); // professor receiving the notification
            noti.setSource(user); // applicant (sender)
            noti.setRelatedId(newApp.getApplicationId());
            noti.setRelatedType("curator_application");
            noti.setNotificationType("CURATOR_APPLICATION_SUBMITTED");
            noti.setMessage(user.getUsername() + " has submitted a curator application.");
            noti.setRead(false);
            noti.setCreatedAt(LocalDateTime.now());

            notificationRepository.save(noti);
        }
        model.addAttribute("success", "Your application has been submitted.");
        return "nonReact/curatorStatus";
    }
    
    
    //Professor review side
    
    @GetMapping("/professor/review/{applicationId}")
    public String reviewCuratorApplication(@PathVariable Integer applicationId,
                                           @RequestParam("notiId") Integer notiId,
                                           HttpSession session,
                                           Model model) {
        User reviewer = (User) session.getAttribute("loggedInUser");
        if (reviewer == null || reviewer.getRole() != UserRole.professor) {
            return "redirect:/login";
        }

        Optional<CuratorApplication> optionalApp = curatorApplicationRepo.findById(applicationId);
        if (optionalApp.isEmpty()) {
            model.addAttribute("error", "Application not found.");
            return "error";
        }
        
     


        // Mark the notification as read
        notificationRepository.findById(notiId).ifPresent(noti -> {
            noti.setRead(true);
            notificationRepository.save(noti);
        });

        model.addAttribute("curapplication", optionalApp.get());
        return "nonReact/curatorReview";
    }

    @PostMapping("/professor/review/{applicationId}")
    public String submitReview(@PathVariable Integer applicationId,
                               @RequestParam String action,
                               @RequestParam(required = false) String reason,
                               HttpSession session,
                               Model model) {
        User reviewer = (User) session.getAttribute("loggedInUser");
        if (reviewer == null || reviewer.getRole() != UserRole.professor) {
            return "redirect:/login";
        }

        Optional<CuratorApplication> optionalApp = curatorApplicationRepo.findById(applicationId);
        if (optionalApp.isEmpty()) {
            model.addAttribute("error", "Application not found.");
            return "error";
        }

        CuratorApplication app = optionalApp.get();
        User applicant = app.getUser();

        if ("approve".equalsIgnoreCase(action)) {
            app.setApplicationStatus(ApplicationStatus.accepted);
            applicant.setRole(UserRole.curator);
            userRepository.save(applicant);

            Notification approvalNoti = new Notification();
            approvalNoti.setRecipient(applicant);
            approvalNoti.setSource(reviewer);
            approvalNoti.setRelatedId(app.getApplicationId());
            approvalNoti.setRelatedType("curator_application");
            approvalNoti.setNotificationType("CURATOR_APPLICATION_APPROVED");
            approvalNoti.setMessage("Sir Professor " + reviewer.getUsername() + " has approved your curator application.");
            approvalNoti.setRead(false);
            approvalNoti.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(approvalNoti);

        } else if ("reject".equalsIgnoreCase(action)) {
            app.setApplicationStatus(ApplicationStatus.rejected);
            app.setRejectionReason(reason != null ? reason.trim() : "");
            curatorApplicationRepo.save(app);

            Notification rejectionNoti = new Notification();
            rejectionNoti.setRecipient(applicant);
            rejectionNoti.setSource(reviewer);
            rejectionNoti.setRelatedId(app.getApplicationId());
            rejectionNoti.setRelatedType("curator_application");
            rejectionNoti.setNotificationType("CURATOR_APPLICATION_REJECTED");
            rejectionNoti.setMessage("Sir Professor " + reviewer.getUsername() + " has rejected your curator application. Reason: " + app.getRejectionReason());
            rejectionNoti.setRead(false);
            rejectionNoti.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(rejectionNoti);
        }

        curatorApplicationRepo.save(app); // Save status change
        return "redirect:/notifications";
    }

    
    
}
