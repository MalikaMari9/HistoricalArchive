package com.example.demo.dto;

public class UserSessionDTO {
    private String username;
    private String email;
    private String role;
    private Integer userId;
    private String profilePicture;
    private String status;
    

    public UserSessionDTO(String username, String email, String role) {
        this.username = username;
        this.email = email;
        this.role = role;
        
    }

    public Integer getUserId() {
		return userId;
	}

	public void setUserId(Integer userId) {
		this.userId = userId;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getProfilePicture() {
		return profilePicture;
	}

	public void setProfilePicture(String profilePicture) {
		this.profilePicture = profilePicture;
	}
    
    

}
