package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.User;

public interface UserRepository extends JpaRepository<User, Integer> {
    
    // Custom finders (optional)
    User findByUsername(String username);

    User findByEmail(String email);

    User findByUsernameAndEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
    
    User findByUserId(Integer userId);

	
   
}

