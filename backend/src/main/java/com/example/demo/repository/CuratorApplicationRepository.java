package com.example.demo.repository;

import com.example.demo.entity.ApplicationStatus;
import com.example.demo.entity.CuratorApplication;
import com.example.demo.entity.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CuratorApplicationRepository extends JpaRepository<CuratorApplication, Integer> {

    // Find all applications by a specific user
    List<CuratorApplication> findByUser(User user);

    // Optional: Find a single application by user
    Optional<CuratorApplication> findFirstByUser(User user);

    // Check if a user has already submitted an application
    boolean existsByUser(User user);

	List<CuratorApplication> findByApplicationStatus(ApplicationStatus pending);
	
	Page<CuratorApplication> findByApplicationStatus(ApplicationStatus status, Pageable pageable);

	long countByApplicationStatus(ApplicationStatus status);
	
	
	List<CuratorApplication> findByApplicationStatusOrderBySubmittedAtDesc(ApplicationStatus pending);

}
