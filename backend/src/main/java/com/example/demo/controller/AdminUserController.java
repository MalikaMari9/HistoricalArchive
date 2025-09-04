package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.entity.CuratorApplication;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.CuratorApplicationRepository;
import com.example.demo.repository.UserRepository;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CuratorApplicationRepository curatorApplicationRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        List<User> users = userRepository.findAll();
        
        List<Map<String, Object>> userDtos = users.stream().map(user -> {
            Map<String, Object> userDto = new HashMap<>();
            userDto.put("userId", user.getUserId());
            userDto.put("username", user.getUsername());
            userDto.put("email", user.getEmail());
            userDto.put("role", user.getRole().name());
            userDto.put("createdAt", user.getCreatedAt());
            userDto.put("restricted", user.isRestricted());
            
            // Get curator application status if exists
            Optional<CuratorApplication> curatorApp = curatorApplicationRepository.findFirstByUser(user);
            if (curatorApp.isPresent()) {
                userDto.put("curatorApplicationStatus", curatorApp.get().getApplicationStatus().name().toLowerCase());
            } else {
                userDto.put("curatorApplicationStatus", null);
            }
            
            return userDto;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(userDtos);
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Integer id, @RequestParam("role") String role) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            UserRole newRole = UserRole.valueOf(role);
            User user = optionalUser.get();
            user.setRole(newRole);
            userRepository.save(user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid role");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // Change semantics: delete => restrict
        User u = userRepository.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        u.setRestricted(true);
        userRepository.save(u);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restrict")
    public ResponseEntity<?> restrictUser(@PathVariable Integer id) {
        return userRepository.findById(id).map(u -> {
            u.setRestricted(true);
            userRepository.save(u);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/unrestrict")
    public ResponseEntity<?> unrestrictUser(@PathVariable Integer id) {
        return userRepository.findById(id).map(u -> {
            u.setRestricted(false);
            userRepository.save(u);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}


