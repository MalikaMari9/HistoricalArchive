// src/api/artifacts.ts
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/artifacts';

export interface Artifact {
  _id: string;
  title: string;
  description: string;
  category: string;
  culture: string;
  period: string;
  medium: string;
  images: ArtifactImage[];
  image_url: string;

  location: {
    river?: string;
    city?: string;
    region?: string;
    country?: string;
    continent?: string;
    latitude?: number;
    longitude?: number;
  };
  averageRating: number;
  totalRatings: number;
}

export interface ArtifactImage {
  date: string;
  copyright: string;
  imageid: number;
  idsid: number;
  format: string;
  description: string | null;
  technique: string | null;
  renditionnumber: string;
  displayorder: number;
  baseimageurl: string;
  alttext: string | null;
  width: number;
  publiccaption: string | null;
  iiifbaseuri: string;
  height: number;
}

export const fetchArtifacts = async (searchQuery: string, category: string, page: number, size: number = 6) => {
  const response = await axios.get<{
    content: Artifact[];
    totalElements: number;
    number: number;
    size: number;
  }>(API_URL, {
    params: {
      search: searchQuery,
      category,
      page: page - 1, // Spring Boot pages are 0-indexed
      size,
    },
  });
  return {
    artifacts: response.data.content,
    totalItems: response.data.totalElements,
    currentPage: response.data.number + 1, // Convert back to 1-indexed
    totalPages: Math.ceil(response.data.totalElements / size),
  };
};