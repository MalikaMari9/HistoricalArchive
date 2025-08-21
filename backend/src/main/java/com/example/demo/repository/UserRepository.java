package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    
    // Custom finders (optional)
    User findByUsername(String username);

    User findByEmail(String email);

    User findByUsernameAndEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

	User findByUserId(Integer userId);
	
	List<User> findByRole(UserRole role);
	
	 long countByCreatedAtAfter(LocalDateTime createdAt);
	 
	


}

	