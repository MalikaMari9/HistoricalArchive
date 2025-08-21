package com.example.demo.repository;

import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    // Get all notifications for a recipient (e.g., professor)
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);

    // Optional: get unread notifications for a user
    List<Notification> findByRecipientAndIsReadFalseOrderByCreatedAtDesc(User recipient);

    // Optional: count unread notifications
    long countByRecipientAndIsReadFalse(User recipient);
}