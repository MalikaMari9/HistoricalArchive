


package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.entity.ContactUs;
import com.example.demo.repository.ContactUsRepository;

@RestController
@RequestMapping("/api/contact")
public class ContactUsController {

    @Autowired
    private ContactUsRepository contactUsRepository;

    @PostMapping
    public void submitMessage(@RequestBody ContactUs contactUs) {
        contactUs.setCreatedAt(java.time.LocalDateTime.now());
        contactUs.setDeleted(false);
        contactUsRepository.save(contactUs);
    }
}

