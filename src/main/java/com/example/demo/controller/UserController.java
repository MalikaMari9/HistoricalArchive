package com.example.demo.controller;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.UserRepository;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.UUID;

@Controller
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private static final String DEFAULT_PROFILE_PATH = "/images/default.png";

    // Show registration form
    @GetMapping("/register")
    public String showRegisterForm(Model model) {
        model.addAttribute("user", new User());
        return "nonReact/register"; // View to be created later
    }

    // Handle registration form submission
    @PostMapping("/register")
    public String processRegister(@ModelAttribute("user") User user, Model model) {
    	
    	
    	user.setUsername(user.getUsername().trim());
        user.setEmail(user.getEmail().trim().toLowerCase());
    	
        // Manual length validation
        if (user.getUsername().length() > 254) {
            model.addAttribute("error", "Username must be less than 255 characters.");
            return "nonReact/register";
        }

        if (user.getEmail().length() > 254) {
            model.addAttribute("error", "Email must be less than 255 characters.");
            return "nonReact/register";
        }

        // Uniqueness checks
        if (userRepository.existsByUsername(user.getUsername())) {
            model.addAttribute("error", "Username already taken.");
            return "nonReact/register";
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            model.addAttribute("error", "Email already registered.");
            return "nonReact/register";
        }

        // Default values
        user.setRole(UserRole.visitor);
        user.setProfilePath(DEFAULT_PROFILE_PATH);
        user.setCreatedAt(LocalDateTime.now());

        // Hash password
        String hashedPassword = org.springframework.security.crypto.bcrypt.BCrypt
            .hashpw(user.getPassword(), org.springframework.security.crypto.bcrypt.BCrypt.gensalt());
        user.setPassword(hashedPassword);

        userRepository.save(user);

        model.addAttribute("success", "Account created successfully.");
        return "redirect:/login";
    }

    
    @GetMapping("/login")
    public String showLoginForm(Model model) {
        model.addAttribute("user", new User()); // We only need username and password
        return "nonReact/login"; // View to be created next
    }

    @PostMapping("/login")
    public String processLogin(@RequestParam("usnOrEmail") String usnOrEmail,
                               @RequestParam("password") String password,
                               Model model,
                               HttpSession session) {

        User dbUser = userRepository.findByUsername(usnOrEmail);
        if (dbUser == null) {
            dbUser = userRepository.findByEmail(usnOrEmail);
        }

        if (dbUser == null) {
            model.addAttribute("error", "Account not found.");
            return "nonReact/login";
        }

        boolean passwordMatch = org.springframework.security.crypto.bcrypt.BCrypt
            .checkpw(password, dbUser.getPassword());

        if (!passwordMatch) {
            model.addAttribute("error", "Incorrect password.");
            return "nonReact/login";
        }

        // Login successful
        session.setAttribute("loggedInUser", dbUser);
        return "redirect:/dashboard";
    }

    
    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) return "redirect:/login";

        model.addAttribute("username", user.getUsername());
        return "nonReact/dashboard";
    }
    
    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }



   

@GetMapping("/check-username")
@ResponseBody
public boolean checkUsername(@RequestParam("username") String username) {
    return userRepository.existsByUsername(username);
}

@GetMapping("/check-email")
@ResponseBody
public boolean checkEmail(@RequestParam("email") String email) {
    return userRepository.existsByEmail(email);
}

@GetMapping("/profile/{userId}")
public String showUserProfile(@PathVariable Integer userId, Model model) {
    User user = userRepository.findByUserId(userId);
    if (user == null) {
        // Handle case when user is not found
        return "error"; // You should create an error.html page
    }
    model.addAttribute("user", user);
    return "nonReact/profile";
}

//Edit profile form
//Edit profile form
@GetMapping("/profile/{userId}/edit")
public String showEditProfileForm(@PathVariable Integer userId, Model model, HttpSession session) {
 // Check if logged in user matches the requested profile
 User loggedInUser = (User) session.getAttribute("loggedInUser");
 if (loggedInUser == null || !loggedInUser.getUserId().equals(userId)) {
     return "redirect:/login";
 }

 User user = userRepository.findByUserId(userId);
 if (user == null) {
     return "error";
 }
 
 model.addAttribute("user", user);
 return "nonReact/editProfile";
}

//Update profile
@PostMapping("/profile/{userId}/edit")
public String updateProfile(
        @PathVariable Integer userId,
        @ModelAttribute("user") User updatedUser,
        @RequestParam(value = "newPassword", required = false) String newPassword,
        @RequestParam(value = "profileImage", required = false) MultipartFile imgFile,
        HttpSession session, Model model) throws IOException {

    User loggedInUser = (User) session.getAttribute("loggedInUser");
    if (loggedInUser == null || !loggedInUser.getUserId().equals(userId)) {
        return "redirect:/login";
    }

    User existingUser = userRepository.findByUserId(userId);
    if (existingUser == null) {
        return "error";
    }

    String newUsername = updatedUser.getUsername().trim();
    String newEmail = updatedUser.getEmail().trim().toLowerCase();

    // Check uniqueness
    User userByUsername = userRepository.findByUsername(newUsername);
    if (userByUsername != null && !userByUsername.getUserId().equals(userId)) {
        model.addAttribute("error", "Username already taken.");
        model.addAttribute("user", existingUser);
        return "nonReact/editProfile";
    }

    User userByEmail = userRepository.findByEmail(newEmail);
    if (userByEmail != null && !userByEmail.getUserId().equals(userId)) {
        model.addAttribute("error", "Email already registered.");
        model.addAttribute("user", existingUser);
        return "nonReact/editProfile";
    }

    // Update basic fields
    existingUser.setUsername(newUsername);
    existingUser.setEmail(newEmail);
    existingUser.setModifiedAt(LocalDateTime.now());

    // Handle password update if provided
    if (newPassword != null && !newPassword.isEmpty()) {
        String hashedPassword = org.springframework.security.crypto.bcrypt.BCrypt
            .hashpw(newPassword, org.springframework.security.crypto.bcrypt.BCrypt.gensalt());
        existingUser.setPassword(hashedPassword);
    }

    // Handle profile image upload
    if (imgFile != null && !imgFile.isEmpty()) {
        try {
            // Generate unique filename
            String fileName = UUID.randomUUID().toString() + "_" + imgFile.getOriginalFilename();
            
            // Create upload directory if it doesn't exist
            Path uploadDir = Paths.get("uploads/users/");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // Save file to server
            Path filePath = uploadDir.resolve(fileName);
            Files.copy(imgFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Store relative path in database
            String relativePath = "/uploads/users/" + fileName;
            existingUser.setProfilePath(relativePath);
            
        } catch (IOException e) {
            e.printStackTrace();
            model.addAttribute("error", "Failed to upload profile image");
            return "nonReact/editProfile";
        }
    }

    userRepository.save(existingUser);
    
    // Update session with latest user data
    session.setAttribute("loggedInUser", existingUser);
    
    return "redirect:/profile/" + userId;
}

@GetMapping("/profile/{userId}/change-password")
public String showChangePasswordForm(@PathVariable Integer userId, Model model, HttpSession session) {
    User loggedInUser = (User) session.getAttribute("loggedInUser");
    if (loggedInUser == null || !loggedInUser.getUserId().equals(userId)) {
        return "redirect:/login";
    }

    model.addAttribute("user", loggedInUser);
    return "nonReact/changePassword";
}

@PostMapping("/profile/{userId}/change-password")
public String processChangePassword(
        @PathVariable Integer userId,
        @RequestParam("oldPassword") String oldPassword,
        @RequestParam("newPassword") String newPassword,
        @RequestParam("confirmPassword") String confirmPassword,
        HttpSession session,
        Model model) {

    User loggedInUser = (User) session.getAttribute("loggedInUser");
    if (loggedInUser == null || !loggedInUser.getUserId().equals(userId)) {
        return "redirect:/login";
    }

    // Verify old password
    if (!BCrypt.checkpw(oldPassword, loggedInUser.getPassword())) {
        model.addAttribute("error", "Current password is incorrect.");
        model.addAttribute("user", loggedInUser);
        return "nonReact/changePassword";
    }

    // Check if new password matches confirmation
    if (!newPassword.equals(confirmPassword)) {
        model.addAttribute("error", "New password and confirmation password do not match.");
        model.addAttribute("user", loggedInUser);
        return "nonReact/changePassword";
    }

    // Check password length
    if (newPassword.length() < 3) {
        model.addAttribute("error", "Password must be at least 3 characters long.");
        model.addAttribute("user", loggedInUser);
        return "nonReact/changePassword";
    }

    // Update password
    String hashedPassword = BCrypt.hashpw(newPassword, BCrypt.gensalt());
    loggedInUser.setPassword(hashedPassword);
    loggedInUser.setModifiedAt(LocalDateTime.now());
    userRepository.save(loggedInUser);

    // Update session
    session.setAttribute("loggedInUser", loggedInUser);

    model.addAttribute("success", "Password changed successfully.");
    model.addAttribute("user", loggedInUser);
    return "nonReact/changePassword";
}



}