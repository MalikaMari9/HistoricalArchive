package com.example.demo.repository;

import com.example.demo.entity.ContactUs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactUsRepository extends JpaRepository<ContactUs, Integer> {

    // Get only non-deleted
    Page<ContactUs> findByIsDeletedFalse(Pageable pageable);

    // Get all (including deleted)
    Page<ContactUs> findAll(Pageable pageable);
}
