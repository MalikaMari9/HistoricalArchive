package com.example.demo.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.Announcement;
import com.example.demo.repository.AnnouncementRepository;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class AnnouncementController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @GetMapping
    public ResponseEntity<List<Announcement>> listPublished() {
        return ResponseEntity.ok(announcementRepository.findPublished(LocalDateTime.now()));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Announcement>> listAll() {
        return ResponseEntity.ok(announcementRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Announcement a = new Announcement();
            a.setTitle(String.valueOf(body.getOrDefault("title", "")));
            a.setType(String.valueOf(body.getOrDefault("type", "feature")));
            // Expect ISO string at key dateTimeISO
            String iso = String.valueOf(body.get("dateTimeISO"));
            LocalDateTime scheduled = LocalDateTime.parse(iso.replace("Z", ""));
            a.setScheduledAt(scheduled);
            a.setSummary(String.valueOf(body.getOrDefault("summary", "")));
            a.setTagsCsv(String.valueOf(body.getOrDefault("tagsCsv", "")));
            // link fields removed

            if (a.getTitle() == null || a.getTitle().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Title is required");
            }

            Announcement saved = announcementRepository.save(a);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid payload: " + e.getMessage());
        }
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> count() {
        Map<String, Object> m = new HashMap<>();
        m.put("count", announcementRepository.count());
        return ResponseEntity.ok(m);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        return announcementRepository.findById(id)
                .map(existing -> {
                    if (body.containsKey("title")) existing.setTitle(String.valueOf(body.get("title")));
                    if (body.containsKey("type")) existing.setType(String.valueOf(body.get("type")));
                    if (body.containsKey("summary")) existing.setSummary(String.valueOf(body.get("summary")));
                    if (body.containsKey("tagsCsv")) existing.setTagsCsv(String.valueOf(body.get("tagsCsv")));
                    if (body.containsKey("dateTimeISO")) {
                        String iso = String.valueOf(body.get("dateTimeISO"));
                        LocalDateTime scheduled = LocalDateTime.parse(iso.replace("Z", ""));
                        existing.setScheduledAt(scheduled);
                    }
                    return ResponseEntity.ok(announcementRepository.save(existing));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        if (!announcementRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        announcementRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}


