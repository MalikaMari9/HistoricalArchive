package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.demo.entity.Announcement;

public interface AnnouncementRepository extends JpaRepository<Announcement, Integer> {
    @Query("select a from Announcement a where a.scheduledAt <= :now order by a.scheduledAt desc")
    List<Announcement> findPublished(LocalDateTime now);
}


