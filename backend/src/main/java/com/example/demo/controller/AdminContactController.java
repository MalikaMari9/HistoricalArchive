package com.example.demo.controller;

import com.example.demo.entity.ContactUs;
import com.example.demo.repository.ContactUsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/contact")
public class AdminContactController {

    @Autowired
    private ContactUsRepository contactUsRepository;

    // GET /api/admin/contact?page=0&size=10&includeDeleted=true
    @GetMapping
    public Page<ContactUs> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "false") boolean includeDeleted
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return includeDeleted
                ? contactUsRepository.findAll(pageable)
                : contactUsRepository.findByIsDeletedFalse(pageable);
    }

    // GET /api/admin/contact/{id}
    @GetMapping("/{id}")
    public ContactUs getOne(@PathVariable int id) {
        return contactUsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact message not found"));
    }

    // PATCH /api/admin/contact/{id}/delete
    @PatchMapping("/{id}/delete")
    public void softDelete(@PathVariable int id) {
        ContactUs contact = contactUsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact message not found"));
        contact.setDeleted(true);
        contactUsRepository.save(contact);
    }

    // PATCH /api/admin/contact/{id}/restore
    @PatchMapping("/{id}/restore")
    public void restore(@PathVariable int id) {
        ContactUs contact = contactUsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact message not found"));
        contact.setDeleted(false);
        contactUsRepository.save(contact);
    }

    // DELETE /api/admin/contact/{id} (hard delete)
    @DeleteMapping("/{id}")
    public void hardDelete(@PathVariable int id) {
        contactUsRepository.deleteById(id);
    }
}
