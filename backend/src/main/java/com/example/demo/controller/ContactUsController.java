package com.example.demo.controller;

import com.example.demo.entity.ContactUs;
import com.example.demo.repository.ContactUsRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ContactUsController {

    @Autowired
    private ContactUsRepository contactUsRepository;

    // DTO defined internally
    public static class ContactUsDTO {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        public String email;

        @NotBlank(message = "Subject is required")
        @Size(min = 3, max = 100, message = "Subject must be 3–100 characters")
        public String subject;

        @NotBlank(message = "Content is required")
        @Size(min = 10, max = 1000, message = "Content must be 10–1000 characters")
        public String content;
    }

    @PostMapping
    public ResponseEntity<Void> submitMessage(@Valid @RequestBody ContactUsDTO dto) {
        ContactUs contact = new ContactUs();
        contact.setEmail(dto.email);
        contact.setSubject(dto.subject);
        contact.setContent(dto.content);
        contact.setCreatedAt(LocalDateTime.now());
        contact.setDeleted(false);

        contactUsRepository.save(contact);
        return ResponseEntity.status(201).build(); // Created
    }
}
