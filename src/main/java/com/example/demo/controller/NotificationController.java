package com.example.demo.controller;

import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.repository.NotificationRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepo;

    @GetMapping
    public String viewNotifications(HttpSession session, Model model) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return "redirect:/login";

        List<Notification> notifications = notificationRepo.findByRecipientOrderByCreatedAtDesc(user);
        model.addAttribute("notifications", notifications);
        return "nonReact/notification_list";
    }

    @GetMapping("/mark-read/{notiId}")
    public String markAsReadAndRedirect(@PathVariable Integer notiId, HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return "redirect:/login";

        Notification noti = notificationRepo.findById(notiId).orElse(null);
        if (noti == null || !noti.getRecipient().getUserId().equals(user.getUserId())) {
            return "redirect:/notifications";
        }

        noti.setRead(true);
        notificationRepo.save(noti);

        // Redirect to the review page for curator applications
        if ("curator_application".equals(noti.getRelatedType())) {
        	return "redirect:/professor/review/" + noti.getRelatedId() + "?notiId=" + noti.getNotiId();

        }

        // Default fallback
        return "redirect:/notifications";
    }
}
