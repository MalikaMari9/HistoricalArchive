package com.example.demo.controller;

import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.repository.NotificationRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
 
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepo;

    @GetMapping
    public List<Notification> getNotifications(
            HttpSession session,
            @RequestParam(value = "unreadOnly", required = false, defaultValue = "false") boolean unreadOnly
    ) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            throw new RuntimeException("Login required");
        }

        if (unreadOnly) {
            return notificationRepo.findByRecipientAndIsReadFalseOrderByCreatedAtDesc(user);
        } else {
            return notificationRepo.findByRecipientOrderByCreatedAtDesc(user);
        }
    }

    @PutMapping("/{id}/read")
    public void markAsRead(@PathVariable Integer id, HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            throw new RuntimeException("Login required");
        }

        Notification noti = notificationRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!noti.getRecipient().getUserId().equals(user.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }

        noti.setRead(true);
        notificationRepo.save(noti);
    }

    @PutMapping("/mark-all-read")
    public void markAllAsRead(HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            throw new RuntimeException("Login required");
        }

        List<Notification> unread = notificationRepo.findByRecipientAndIsReadFalseOrderByCreatedAtDesc(user);
        unread.forEach(n -> n.setRead(true));
        notificationRepo.saveAll(unread);
    }
}
