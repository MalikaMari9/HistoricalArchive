package com.example.demo.controller;

import com.example.demo.dto.ChangePasswordRequest;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.SignUpRequest;
import com.example.demo.dto.UserSessionDTO;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.entity.UserStatus;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RestController
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private static final String UPLOAD_DIR = "uploads/profile-pictures/";
    private static final String DEFAULT_PROFILE_PATH = "/images/default.png";
    
    // Initialize upload directory
    static {
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    // Handle JSON registration (without profile picture)
    @PostMapping(value = "/api/users/register", consumes = {"application/json"})
    public ResponseEntity<?> registerUserJson(@RequestBody SignUpRequest signUpRequest) {
        return registerUser(signUpRequest, null);
    }

    // Handle multipart form data registration (with optional profile picture)
    @PostMapping(value = "/api/users/register", consumes = {"multipart/form-data"})
    public ResponseEntity<?> registerUserWithFile(
            @RequestParam("username") String username,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        
        SignUpRequest signUpRequest = new SignUpRequest();
        signUpRequest.setUsername(username);
        signUpRequest.setEmail(email);
        signUpRequest.setPassword(password);
        
        return registerUser(signUpRequest, file);
    }

    // Common registration logic
    private ResponseEntity<?> registerUser(SignUpRequest signUpRequest, MultipartFile file) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }

        User user = new User();
        user.setUsername(signUpRequest.getUsername().trim());
        user.setEmail(signUpRequest.getEmail().trim().toLowerCase());
        user.setPassword(BCrypt.hashpw(signUpRequest.getPassword(), BCrypt.gensalt()));
        user.setRole(UserRole.visitor);
        user.setCreatedAt(LocalDateTime.now());

        // Handle profile picture upload
        if (file != null && !file.isEmpty()) {
            try {
                // Ensure upload directory exists
                Path uploadPath = Paths.get(UPLOAD_DIR);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                
                // Generate unique filename
                String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                Path filePath = uploadPath.resolve(fileName);
                
                // Save file
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                
                // Set relative path in database
                user.setProfilePath("/" + UPLOAD_DIR + fileName);
            } catch (IOException e) {
                return ResponseEntity.badRequest().body("Error: Failed to upload profile picture");
            }
        } else {
            user.setProfilePath(DEFAULT_PROFILE_PATH);
        }

        userRepository.save(user);
        return ResponseEntity.ok("User registered successfully!");
    }

    // Keep the rest of your existing methods unchanged...
    @PostMapping("/api/users/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest, HttpSession session) {
        User dbUser = userRepository.findByUsername(loginRequest.getUsername());
        if (dbUser == null) {
            dbUser = userRepository.findByEmail(loginRequest.getUsername());
        }

        if (dbUser == null) {
            return ResponseEntity.badRequest().body("Error: Account not found.");
        }
        
        if (dbUser.isRestricted()) {
            return ResponseEntity.status(403).body("Your account is restricted. Please contact support.");
        }

        
        if (dbUser.getStatus() == UserStatus.RESTRICTED) {
            return ResponseEntity.status(403).body("Your account is restricted. Please contact support.");
        }


        boolean passwordMatch = BCrypt.checkpw(loginRequest.getPassword(), dbUser.getPassword());

        if (!passwordMatch) {
            return ResponseEntity.badRequest().body("Error: Incorrect password.");
        }

        // Store both the User object and username in session for consistency
        session.setAttribute("loggedInUser", dbUser);
        session.setAttribute("username", dbUser.getUsername());
        return ResponseEntity.ok("User logged in successfully!");
    }

    @GetMapping("/api/check-username")
    @ResponseBody
    public boolean checkUsername(@RequestParam("username") String username) {
        return userRepository.existsByUsername(username);
    }

    @GetMapping("/api/check-email")
    @ResponseBody
    public boolean checkEmail(@RequestParam("email") String email) {
        return userRepository.existsByEmail(email);
    }
    
    @GetMapping("/api/users/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        User loggedInUser = (User) session.getAttribute("loggedInUser");

        if (loggedInUser == null) {
            return ResponseEntity.status(401).body("Not logged in");
        }

        UserSessionDTO userSessionDTO = new UserSessionDTO(
            loggedInUser.getUsername(),
            loggedInUser.getEmail(),
            loggedInUser.getRole().name()
            
        );
        userSessionDTO.setUserId(loggedInUser.getUserId());
        userSessionDTO.setStatus(loggedInUser.getStatus().name());
        userSessionDTO.setProfilePicture(loggedInUser.getProfilePath());
        return ResponseEntity.ok(userSessionDTO);
    }

    
    @PostMapping("/api/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("Logged out");
    }
    
    @PostMapping("/api/users/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, HttpSession session) {
        // 1. Get the current logged-in user from the session
        User loggedInUser = (User) session.getAttribute("loggedInUser");

        if (loggedInUser == null) {
            return ResponseEntity.status(401).body("User not authenticated.");
        }

        // 2. Verify that the old password is correct
        if (!BCrypt.checkpw(request.getOldPassword(), loggedInUser.getPassword())) {
            return ResponseEntity.badRequest().body("Incorrect old password.");
        }
        
        // 3. Make sure the new password and confirmation password match (though frontend should handle this)
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body("New passwords do not match.");
        }

        // 4. Update the user's password with a new hash
        loggedInUser.setPassword(BCrypt.hashpw(request.getNewPassword(), BCrypt.gensalt()));
        loggedInUser.setModifiedAt(LocalDateTime.now());
        
        userRepository.save(loggedInUser);

        // 5. Update the user object in the session to reflect the new password hash
        session.setAttribute("loggedInUser", loggedInUser);
        
        return ResponseEntity.ok("Password changed successfully.");
    }
}