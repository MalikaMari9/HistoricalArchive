package com.example.demo.dto;

public class ProfileResponse {
    private String username;
    private String email;
    private String profilePicture;
    private String fullName;
    private String role;

    // Constructors
    public ProfileResponse() {}

    public ProfileResponse(String username, String email, String profilePicture, 
                         String fullName, String role) {
        this.username = username;
        this.email = email;
        this.profilePicture = profilePicture;
        this.fullName = fullName;
        this.role = role;
    }

    // Getters and Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getProfilePicture() { return profilePicture; }
    public void setProfilePicture(String profilePicture) { this.profilePicture = profilePicture; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}