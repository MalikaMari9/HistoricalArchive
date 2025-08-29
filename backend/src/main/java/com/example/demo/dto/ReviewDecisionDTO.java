package com.example.demo.dto;

import java.time.LocalDateTime;

public class ReviewDecisionDTO {
    private String type;         // "artifact" or "curator"
    private String title;        // artifact title or applicant fname
    private String decision;     // "approved" or "rejected"
    private String curator;      // curator username
    private LocalDateTime date;  // decision date

    public ReviewDecisionDTO(String type, String title, String decision, String curator, LocalDateTime date) {
        this.type = type;
        this.title = title;
        this.decision = decision;
        this.curator = curator;
        this.date = date;
    }

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getDecision() {
		return decision;
	}

	public void setDecision(String decision) {
		this.decision = decision;
	}

	public String getCurator() {
		return curator;
	}

	public void setCurator(String curator) {
		this.curator = curator;
	}

	public LocalDateTime getDate() {
		return date;
	}

	public void setDate(LocalDateTime date) {
		this.date = date;
	}

    
}
