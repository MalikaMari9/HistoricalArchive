package com.example.demo.entity;

public class LocationInfo {
	private String placename = "";
    private String river = "";
    private String city = "";
    private String region = "";
    private String country = "";
    private String continent = "";
    private Double latitude;
    private Double longitude;
    
    public LocationInfo() {}

    
	public String getPlacename() {
		return placename;
	}


	public void setPlacename(String placename) {
		this.placename = placename;
	}


	public String getRiver() {
		return river;
	}

	public void setRiver(String river) {
		this.river = river;
	}

	public String getCity() {
		return city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getRegion() {
		return region;
	}

	public void setRegion(String region) {
		this.region = region;
	}

	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getContinent() {
		return continent;
	}

	public void setContinent(String continent) {
		this.continent = continent;
	}

	public Double getLatitude() {
		return latitude;
	}

	public void setLatitude(Double latitude) {
		this.latitude = latitude;
	}

	public Double getLongitude() {
		return longitude;
	}

	public void setLongitude(Double longitude) {
		this.longitude = longitude;
	}

    
}