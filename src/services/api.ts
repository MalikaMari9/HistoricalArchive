// src/services/api.ts
import { User } from "@/hooks/useAuth";
import axios from "axios";
/**
 * Axios API client configuration
 * - Base URL: Spring Boot backend at http://localhost:8080/api
 * - JSON headers
 * - Interceptor: adds Bearer token from localStorage if present
 */
const API_BASE_URL = "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.defaults.withCredentials = true; // Let's check this again

/* ------------------------------- Auth APIs -------------------------------- */

export const login = async (payload: {
  username: string;
  password: string;
}) => {
  // session cookie set by backend
  await api.post("/users/login", payload, { withCredentials: true });
};

export const getMe = async (): Promise<User> => {
  const res = await api.get("/users/me", { withCredentials: true });
  return res.data;
};

/* ----------------------------- Auth (signup) ----------------------------- */

export const checkUsername = async (username: string): Promise<boolean> => {
  const res = await api.get<boolean>("/check-username", {
    params: { username },
  });
  return res.data; // true if taken
};

export const checkEmail = async (email: string): Promise<boolean> => {
  const res = await api.get<boolean>("/check-email", { params: { email } });
  return res.data; // true if taken
};

/**
 * Registers a user.
 * - If profileImage provided -> multipart/form-data
 * - Else -> JSON
 */
export const registerUser = async (payload: {
  username: string;
  email: string;
  password: string;
  profileImage?: File | null;
}): Promise<void> => {
  const { username, email, password, profileImage } = payload;

  if (profileImage) {
    const fd = new FormData();
    fd.append("username", username);
    fd.append("email", email);
    fd.append("password", password);
    fd.append("file", profileImage);
    await api.post("/users/register", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    await api.post("/users/register", { username, email, password });
  }
};

// --- Password change ---
export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const changeMyPassword = async (payload: ChangePasswordPayload) => {
  const res = await api.post<{ message?: string }>(
    "/users/change-password",
    payload,
    {
      withCredentials: true,
    }
  );
  return res.data;
};

/* -------------------------------------------------------------------------- */
/*                               DASHBOARD APIS                               */
/* -------------------------------------------------------------------------- */

// --- Add near your other admin types ---

export interface AdminDashboardStats {
  totalUsers: number;
  totalArtworks: number;
  // add more fields if your backend returns them
  [key: string]: any;
}

export interface AdminRecentActivity {
  id: number;
  action: string;
  details: string;
  timestamp: string; // ISO
}

// --- Lightly type these + accept { signal } ---

export const fetchDashboardStats = async (opts?: {
  signal?: AbortSignal;
}): Promise<AdminDashboardStats> => {
  const res = await api.get<AdminDashboardStats>("/admin/dashboard/stats", {
    signal: opts?.signal as any,
  });
  return res.data;
};

export const fetchRecentActivities = async (opts?: {
  signal?: AbortSignal;
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminRecentActivity>> => {
  const res = await api.get<PageResponse<AdminRecentActivity>>(
    "/admin/dashboard/activities",
    {
      signal: opts?.signal as any,
      params: {
        page: opts?.page ?? 0,
        size: opts?.size ?? 10,
      },
    }
  );
  return res.data;
};

export const countAnnouncementsAdmin = async (opts?: {
  signal?: AbortSignal;
}): Promise<number> => {
  const res = await api.get<{ count: number }>("/announcements/count", {
    signal: opts?.signal as any,
  });
  return res.data.count;
};

/* -------------------------------------------------------------------------- */
/*                                 USERS (Admin)                              */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  userId: number;
  username: string;
  email: string;
  role: "admin" | "professor" | "curator" | "visitor";
  createdAt?: string;
  restricted?: boolean;
}

export const adminListUsers = async (): Promise<AdminUser[]> => {
  const res = await api.get<AdminUser[]>("/admin/users");
  return res.data;
};

export const adminUpdateUserRole = async (
  id: number,
  role: AdminUser["role"]
): Promise<void> => {
  await api.patch(`/admin/users/${id}/role`, undefined, { params: { role } });
};

export const adminDeleteUser = async (id: number): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

export const adminRestrictUser = async (id: number): Promise<void> => {
  await api.post(`/admin/users/${id}/restrict`);
};

export const adminUnrestrictUser = async (id: number): Promise<void> => {
  await api.post(`/admin/users/${id}/unrestrict`);
};

/* -------------------------------------------------------------------------- */
/*                               CATEGORIES (Admin)                           */
/* -------------------------------------------------------------------------- */

export interface AdminCategory {
  categoryId: number;
  name: string;
  description?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

export const adminListCategories = async (): Promise<AdminCategory[]> => {
  const res = await api.get<AdminCategory[]>("/admin/categories");
  return res.data;
};

export const adminGetCategoryCount = async (): Promise<number> => {
  const res = await api.get<number>("/admin/categories/count");
  return res.data;
};

export const adminCreateCategory = async (
  payload: Pick<AdminCategory, "name" | "description"> &
    Partial<Pick<AdminCategory, "status">>
): Promise<AdminCategory> => {
  const res = await api.post<AdminCategory>("/admin/categories", {
    name: payload.name,
    description: payload.description ?? "",
    status: payload.status ?? "active",
  });
  return res.data;
};

export const adminUpdateCategory = async (
  id: number,
  updates: Partial<Pick<AdminCategory, "name" | "description" | "status">>
): Promise<AdminCategory> => {
  const res = await api.patch<AdminCategory>(
    `/admin/categories/${id}`,
    updates
  );
  return res.data;
};

export const adminDeleteCategory = async (id: number): Promise<void> => {
  await api.delete(`/admin/categories/${id}`);
};

/** Fetch category counts grouped by name */
export const adminCategoryCounts = async (): Promise<
  { name: string; count: number }[]
> => {
  const res = await api.get<{ name: string; count: number }[]>(
    "/admin/categories/counts"
  );
  return res.data;
};

/* -------------------------------------------------------------------------- */
/*                           PENDING REVIEWS (Admin)                          */
/* -------------------------------------------------------------------------- */

export interface PendingUserArtifact {
  userArtifactId: number;
  artifactId: string;
  userId: number;
  savedAt: string;
  status: string;
  reason?: string;
}

export interface PendingReviewItemDto {
  userArtifactId: number;
  artifactId: string;
  title?: string;
  curator?: string;
  category?: string;
  description?: string;
  dimension?: string;
  images?: string[];
  period?: string;
  culture?: string;
  department?: string;
  submittedAt?: string;
  status: string;
}

export const adminListPendingReviews = async (): Promise<
  PendingUserArtifact[]
> => {
  const res = await api.get<PendingUserArtifact[]>("/admin/review/pending");
  return res.data;
};

export const adminApproveReview = async (id: number): Promise<void> => {
  await api.patch(`/admin/review/${id}/approve`);
};

export const adminRejectReview = async (
  id: number,
  reason?: string
): Promise<void> => {
  await api.patch(`/admin/review/${id}/reject`, undefined, {
    params: { reason },
  });
};

/** Top artworks (by views/rating) for Admin Reports */
export const fetchTopArtworks = async (): Promise<
  Array<{ title: string; curator: string; views: number; rating: number }>
> => {
  const res = await api.get("/admin/reports/top-artworks");
  return res.data;
};

/* -------------------------------------------------------------------------- */
/*                          ARTWORKS MANAGEMENT (Admin)                       */
/* -------------------------------------------------------------------------- */

export interface AdminArtworkDto {
  _id: string;
  title: string;
  category?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  image_url?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page
  size: number; // page size
}

export const adminListArtworks = async (
  page = 0,
  size = 10
): Promise<PageResponse<AdminArtworkDto>> => {
  const res = await api.get<PageResponse<AdminArtworkDto>>("/admin/artworks", {
    params: { page, size },
  });
  return res.data;
};

export const adminDeleteArtwork = async (id: string): Promise<void> => {
  await api.delete(`/admin/artworks/${id}`);
};

/* -------------------------------------------------------------------------- */
/*                             SUGGESTION ENDPOINTS                            */
/* -------------------------------------------------------------------------- */

export const fetchCategorySuggestions = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>("/artifacts/suggestions/categories");
    return res.data;
  } catch (err) {
    console.error("Error fetching category suggestions:", err);
    throw err;
  }
};

export const fetchCultureSuggestions = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>("/artifacts/suggestions/cultures");
    return res.data;
  } catch (err) {
    console.error("Error fetching culture suggestions:", err);
    throw err;
  }
};

export const fetchDepartmentSuggestions = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>("/artifacts/suggestions/departments");
    return res.data;
  } catch (err) {
    console.error("Error fetching department suggestions:", err);
    throw err;
  }
};

export const fetchPeriodSuggestions = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>("/artifacts/suggestions/periods");
    return res.data;
  } catch (err) {
    console.error("Error fetching period suggestions:", err);
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                         ARTIFACT SEARCH & FILTERING                        */
/* -------------------------------------------------------------------------- */

export interface Artifact {
  id: string;
  title: string;
  description?: string;
  category?: string;
  culture?: string;
  period?: string;
  medium?: string;
  images: string[];
  location?: { city?: string; country?: string; continent?: string };
  averageRating: number;
  totalRatings: number;
}

export interface ArtifactResponse {
  content: Artifact[];
  totalElements: number;
  number: number;
  size: number;
  totalPages: number;
}

export interface SearchFilters {
  anyField?: string;
  title?: string;
  category?: string;
  culture?: string;
  department?: string;
  period?: string;
  medium?: string;
  artistName?: string;
  tags?: string;
  fromDate?: string;
  toDate?: string;
  // Location filtering
  locationQuery?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  city?: string;
  country?: string;
  page?: number;
  size?: number;
}

/** Global keyword-based search */
export const searchArts = async (
  filters: SearchFilters
): Promise<ArtifactResponse> => {
  try {
    const params = {
      search: filters.anyField ?? "",
      page: filters.page ?? 0,
      size: filters.size ?? 6,
      // Include all filter parameters to enable backend filtering
      anyField: filters.anyField || "",
      title: filters.title || "",
      category: filters.category || "",
      culture: filters.culture || "",
      department: filters.department || "",
      period: filters.period || "",
      medium: filters.medium || "",
      artistName: filters.artistName || "",
      tags: filters.tags || "",
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      // Location parameters
      locationQuery: filters.locationQuery || undefined,
      latitude: filters.latitude || undefined,
      longitude: filters.longitude || undefined,
      radius: filters.radius || undefined,
      city: filters.city || undefined,
      country: filters.country || undefined,
    };

    console.log("🔎 searchArts() calling /artifacts with params:", params);

    const res = await api.get<ArtifactResponse>("/artifacts", {
      params,
    });
    return res.data;
  } catch (err) {
    console.error("Error during global artifact search:", err);
    throw err;
  }
};

/** Detailed/filtered search */
export const searchDetailedArts = async (
  filters: Omit<SearchFilters, "sortBy"> & { page?: number; size?: number }
): Promise<ArtifactResponse> => {
  try {
    const params = {
      anyField: filters.anyField || "",
      title: filters.title || "",
      category: filters.category || "",
      culture: filters.culture || "",
      department: filters.department || "",
      period: filters.period || "",
      medium: filters.medium || "",
      artistName: filters.artistName || "",
      tags: filters.tags || "",
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      // Location parameters
      locationQuery: filters.locationQuery || undefined,
      latitude: filters.latitude || undefined,
      longitude: filters.longitude || undefined,
      radius: filters.radius || undefined,
      city: filters.city || undefined,
      country: filters.country || undefined,
      page: filters.page ?? 0,
      size: filters.size ?? 6,
    };

    const res = await api.get<ArtifactResponse>("/artifacts/search", {
      params,
    });

    return res.data;
  } catch (err) {
    console.error("Error during detailed artifact search:", err);
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                              BOOKMARK MANAGEMENT                           */
/* -------------------------------------------------------------------------- */

export async function getBookmarks() {
  const res = await fetch("http://localhost:8080/api/bookmarks", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load bookmarks");
  return res.json(); // BookmarkDTO[]
}

export async function addBookmark(artifactId: string) {
  const res = await fetch(
    `http://localhost:8080/api/bookmarks?artifactId=${encodeURIComponent(
      artifactId
    )}`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) throw new Error("Already bookmarked or not authorized");
  return res.json(); // BookmarkDTO
}

export async function removeBookmark(artifactId: string) {
  const res = await fetch(
    `http://localhost:8080/api/bookmarks?artifactId=${encodeURIComponent(
      artifactId
    )}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to remove bookmark");
  }
}

export async function isBookmarked(artifactId: string) {
  const res = await fetch(
    `http://localhost:8080/api/bookmarks/check?artifactId=${encodeURIComponent(
      artifactId
    )}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to check bookmark");
  return res.json() as Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/*                            ANNOUNCEMENTS MANAGEMENT                        */
/* -------------------------------------------------------------------------- */

export interface AnnouncementDto {
  id: number;
  title: string;
  type: "maintenance" | "feature" | "event";
  scheduledAt: string; // ISO timestamp
  summary: string;
  tagsCsv?: string;
}

export interface PaginatedAnnouncementsResponse {
  announcements: AnnouncementDto[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Public announcements (published only) */
export const listAnnouncements = async (): Promise<AnnouncementDto[]> => {
  const res = await api.get<AnnouncementDto[]>("/announcements");
  return res.data;
};

/** All announcements (for admin view) */
export const listAllAnnouncements = async (): Promise<AnnouncementDto[]> => {
  const res = await api.get<AnnouncementDto[]>("/announcements/all");
  return res.data;
};

/** Get a single announcement by ID */
export const getAnnouncementById = async (
  id: number
): Promise<AnnouncementDto> => {
  const res = await api.get<AnnouncementDto>(`/announcements/${id}`);
  return res.data;
};

/** Create a new announcement */
export const createAnnouncement = async (payload: {
  title: string;
  type: AnnouncementDto["type"];
  dateTimeISO: string;
  summary: string;
  tagsCsv?: string;
}): Promise<AnnouncementDto> => {
  const res = await api.post<AnnouncementDto>("/announcements", payload);
  return res.data;
};

/** Update an announcement */
export const updateAnnouncement = async (
  id: number,
  payload: Partial<{
    title: string;
    type: AnnouncementDto["type"];
    dateTimeISO: string;
    summary: string;
    tagsCsv: string;
  }>
): Promise<AnnouncementDto> => {
  const res = await api.patch<AnnouncementDto>(`/announcements/${id}`, payload);
  return res.data;
};

/** Delete an announcement */
export const deleteAnnouncement = async (id: number): Promise<void> => {
  await api.delete(`/announcements/${id}`);
};

/** Count all announcements */
export const countAnnouncements = async (): Promise<number> => {
  const res = await api.get<{ count: number }>("/announcements/count");
  return res.data.count;
};

/* ----------------------------- Artifacts/Detail ---------------------------- */

export interface ArtifactDetail {
  _id?: string;
  id?: string;
  artifactId?: string;
  title: string;
  description?: string;
  category?: string;
  culture?: string;
  department?: string;
  period?: string;
  medium?: string;
  dimension?: string;
  tags?:string;
  exact_found_date?:string;
  images?: Array<{
    baseimageurl?: string;
    iiifbaseuri?: string;
    alttext?: string | null;
    imageid?: number;
  }>;
  image_url?: string;
  location?: { city?: string; country?: string; continent?: string };
  averageRating?: number;
  totalRatings?: number;
  artist_name?: string;
}

/** Get a single artifact by ID (path param) */
export const getArtifactById = async (
  artifactId: string
): Promise<ArtifactDetail> => {
  const res = await api.get<ArtifactDetail>(
    `/artifacts/${encodeURIComponent(artifactId)}`
  );
  return res.data;
};

/* --------------------------------- Ratings -------------------------------- */

export interface RatingDTO {
  averageRating: number;
  totalRatings: number;
  userRating?: number; // present if logged in
}

/** Get rating summary (and userRating if logged in) for an artifact */
export const getArtifactRatingInfo = async (
  artifactId: string
): Promise<RatingDTO> => {
  const res = await api.get<RatingDTO>(
    `/ratings/artifact/${encodeURIComponent(artifactId)}`
  );
  return res.data;
};

/** Submit/update a rating for an artifact */
export const submitRating = async (payload: {
  artifactId: string;
  ratingValue: number;
}): Promise<{
  success: boolean;
  averageRating: number;
  totalRatings: number;
  userRating: number;
}> => {
  const res = await api.post("/ratings", payload);
  return res.data;
};

/** Remove current user's rating for an artifact */
export const removeRating = async (
  artifactId: string
): Promise<{
  success: boolean;
  averageRating: number;
  totalRatings: number;
}> => {
  const res = await api.delete(`/ratings/${encodeURIComponent(artifactId)}`);
  return res.data;
};

/* -------------------------------- Bookmarks -------------------------------- */

export interface BookmarkDTO {
  artifactId: string;
}

/** List all bookmarks for current user */
export const listBookmarks = async (): Promise<BookmarkDTO[]> => {
  const res = await api.get<BookmarkDTO[]>("/bookmarks");
  return res.data;
};

/** Add a bookmark (backend expects artifactId as request param) */
export const createBookmark = async (
  artifactId: string
): Promise<BookmarkDTO> => {
  const res = await api.post<BookmarkDTO>("/bookmarks", null, {
    params: { artifactId },
  });
  return res.data;
};

/** Remove a bookmark (204 or 200 both OK) */
export const deleteBookmark = async (artifactId: string): Promise<void> => {
  const res = await api.delete("/bookmarks", { params: { artifactId } });
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(`Unexpected status ${res.status} when deleting bookmark`);
  }
};

/** Check if a specific artifact is bookmarked */
export const checkBookmark = async (artifactId: string): Promise<boolean> => {
  const res = await api.get<boolean>("/bookmarks/check", {
    params: { artifactId },
  });
  return res.data;
};

/* -------------------------------- Comments -------------------------------- */

export interface CommentDTO {
  commentId: number;
  comment: string;
  userId: number;
  username: string;
  createdAt: string;
  reactionCount: number;
  isReacted: boolean;
  parentId?: number;
  replies?: CommentDTO[];
}

export const getCommentsByArtifact = async (
  artifactId: string
): Promise<CommentDTO[]> => {
  const res = await api.get<CommentDTO[]>(
    `/comments/artifact/${encodeURIComponent(artifactId)}`
  );
  return res.data;
};

export const postComment = async (payload: {
  artifactId: string;
  content: string;
  parentId?: number;
}) => {
  const res = await api.post("/comments", payload);
  return res.data as CommentDTO & { success?: boolean };
};

export const reactToComment = async (payload: {
  commentId: number;
  userId: number;
}) => {
  const res = await api.post<{
    success: boolean;
    reactionCount: number;
    isReacted: boolean;
  }>("/comments/react", payload);
  return res.data;
};

/* -------------------------------------------------------------------------- */
/*                                UPLOAD SESSION                              */
/* -------------------------------------------------------------------------- */

/** Check if there's an active upload session; returns the username or null */
export const checkUploadSession = async (): Promise<string | null> => {
  // Backend returns plain text like: "Active session for user: <name>"
  const res = await api.get<string>("/upload/check-session", {
    responseType: "text" as any,
  });
  const text = typeof res.data === "string" ? res.data : String(res.data);
  const marker = "user: ";
  if (text.includes("Active session") && text.includes(marker)) {
    return text.split(marker)[1]?.trim() || null;
  }
  return null;
};

/** Start an upload session (simple username form login) */
export const uploadLogin = async (username: string): Promise<void> => {
  const params = new URLSearchParams();
  params.append("username", username);
  await api.post("/upload/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

/** End the upload session */
export const uploadLogout = async (): Promise<void> => {
  await api.post("/upload/logout");
};

/** Upload artifact with multipart form (images + metadata) */
export const uploadArtifact = async (
  form: FormData
): Promise<{ id: string } & Record<string, any>> => {
  const res = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// src/services/api.ts
// ...existing imports and api client...

/* ------------------------- Curator: My Artworks ------------------------- */

export interface ArtifactImageDto {
  baseimageurl?: string;
  // (other fields optional)
}

export interface MyArtworkDTO {
  _id: string;
  title: string;
  category?: string;
  uploaded_at: string;
  image_url?: string;
  images?: ArtifactImageDto[];
  averageRating: number;
  totalRatings: number;
  status: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ArtifactUpdatePayload {
  title?: string;
  category?: string;
  description?: string;
  culture?: string;
  department?: string;
  period?: string;
  medium?: string;
  dimension?: string;
  image_url?: string;
}

/** List the current user's uploaded artworks (curator) */
export const listMyArtworks = async (
  page = 0,
  size = 25
): Promise<PageResponse<MyArtworkDTO>> => {
  const res = await api.get<PageResponse<MyArtworkDTO>>(
    "/artifacts/my-artworks",
    {
      params: { page, size },
    }
  );
  return res.data;
};

/** Delete a (your) single artwork by id */
export const deleteArtifact = async (id: string): Promise<void> => {
  await api.delete(`/artifacts/${encodeURIComponent(id)}`);
};

/** Update an artwork (full or partial) */
export const updateArtifactMultipart = async (id: string, form: FormData) => {
   const res = await api.put(`/artifacts/${id}`, form, {
     headers: { "Content-Type": "multipart/form-data" },
     withCredentials: true,
   });
   return res.data;
 };



/* ----------------------------- Curator Dashboard ----------------------------- */

export type CuratorStatus = "accepted" | "pending" | "rejected";

export interface CuratorArtworkItem {
  id: number;
  title: string;
  status: CuratorStatus | string; // backend might send varied casing
  submissionDate: string; // ISO
}

export interface CuratorStats {
  totalArtworks: number;
  pendingArtworks: number;
  approvedArtworks: number;
  rejectedArtworks: number;
}

/** My artworks for the dashboard list */
export const curatorListArtworks = async (
  page: number,
  size: number
): Promise<{ items: CuratorArtworkItem[]; total: number }> => {
  const res = await api.get("/curator/artworks", {
    params: { page, size },
  });
  return res.data;
};


/** Aggregated stats for the dashboard header/cards */
export const curatorGetStats = async (): Promise<CuratorStats> => {
  const res = await api.get<CuratorStats>("/curator/stats");
  return res.data;
};

export interface RecentCommentDTO {
  commentId: number;
  comment: string;
  artifactId: string;
  artifactTitle: string;
  username: string;
  createdAt: string;
  isCuratorArtwork: boolean;
}

export const getRecentCommentsForCurator = async (): Promise<
  RecentCommentDTO[]
> => {
  const res = await api.get<RecentCommentDTO[]>("/comments/curator/recent");
  return res.data;
};

/* ---------------------------- Professor Dashboard ---------------------------- */

export type ReviewDecision = "approved" | "rejected";

export interface ProfessorPendingArtwork {
  id: number;
  title: string;
  curator: string;
  category: string;
  submittedDate: string; // ISO
  priority: "high" | "medium" | "low" | string;
}

export interface ProfessorRecentDecision {
  artworkTitle: string;
  decision: ReviewDecision | string;
  curator: string;
  decisionDate: string; // ISO
}

export interface ProfessorStats {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

export interface ProfessorPendingCurator {
  applicationId: number;
  username: string;
  email: string;
  fname: string;
  dob: string; // ISO
  submittedAt: string; // ISO
}

export interface ProfessorPendingArtifact {
  id: string;
  title: string;
  category: string;
  curatorUsername: string; // backend name; we'll map to uploaded_by in the UI
  uploaded_at: string; // ISO
}

export const professorListPendingArtworks = async (): Promise<
  ProfessorPendingArtwork[]
> => {
  const res = await api.get<ProfessorPendingArtwork[]>(
    "/professor/dashboard/pending-artworks"
  );
  return res.data;
};

export async function professorListRecentDecisions(page = 0, size = 5) {
  const res = await axios.get(`/api/professor/dashboard/recent-decisions`, {
    params: { page, size },
  });
  return res.data; // { items: [], total: number }
}


export const professorGetStats = async (): Promise<ProfessorStats> => {
  const res = await api.get<ProfessorStats>("/professor/dashboard/stats");
  return res.data;
};

export const professorListPendingCurators = async (): Promise<
  ProfessorPendingCurator[]
> => {
  const res = await api.get<ProfessorPendingCurator[]>(
    "/professor/dashboard/pending-curators"
  );
  return res.data;
};

export const professorListPendingArtifacts = async (): Promise<
  ProfessorPendingArtifact[]
> => {
  const res = await api.get<ProfessorPendingArtifact[]>(
    "/professor/dashboard/pending-artifacts"
  );
  return res.data;
};

/* ----------------------- Professor: Curator Applications ----------------------- */

export interface ProfessorPendingCurator {
  applicationId: number;
  username: string;
  email: string;
  fname: string;
  dob: string; // ISO
  educationalBackground: string;
  certification: string;
  certificationPath: string;
  personalExperience: string;
  portfolioLink: string;
  motivationReason: string;
  submittedAt: string; // ISO
}

export const applyForCurator = async (form: FormData): Promise<void> => {
  await api.post("/curator/apply", form, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
};

export const getCuratorApplicationStatus = async (): Promise<
  "pending" | "accepted" | "rejected"
> => {
  const res = await api.get("/curator/status", { withCredentials: true });
  return res.data;
};

export const professorListPendingCuratorsApplication = async (opts?: {
  signal?: AbortSignal;
}) => {
  const res = await api.get<ProfessorPendingCurator[]>(
    "/professor/dashboard/pending-curators",
    {
      signal: opts?.signal as any,
    }
  );
  return res.data;
};

export const professorApproveCuratorApp = async (id: number) => {
  await api.post(`/professor/dashboard/applications/${id}/approve`);
};

export const professorRejectCuratorApp = async (id: number, reason: string) => {
  await api.post(`/professor/dashboard/applications/${id}/reject`, { reason });
};

/* ---------------------- Professor: Review Art Submissions ---------------------- */

export type AppStatus = "pending" | "accepted" | "rejected";

export interface ReviewArtifactDto {
  submissionId: number;
  id: string; // artifact Mongo id
  title: string;
  curatorUsername: string;
  category: string;
  submittedAt: string; // ISO
  status: AppStatus | string;
  images: Array<{ baseimageurl?: string; image_url?: string }>;
  description?: string;
  dimension?: string;
  tags?: string[];
  culture?: string;
  department?: string;
  period?: string;
  exact_found_date?: string;
  location?: {
    river?: string;
    city?: string;
    region?: string;
    country?: string;
    continent?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

/** Page of reviewable artifacts */
export const professorListReviewArtifacts = async (
  status: AppStatus,
  page = 0,
  size = 6,
  opts?: { signal?: AbortSignal }
): Promise<{ content: ReviewArtifactDto[]; total: number }> => {
  const res = await api.get<ReviewArtifactDto[]>(
    "/professor/dashboard/review-artifacts",
    {
      params: { status, page, size },
      signal: opts?.signal as any,
    }
  );
  // backend sends total count in header
  const total = parseInt(
    res.headers["x-total-count"] ?? res.headers["X-Total-Count"] ?? "0",
    10
  );
  return { content: res.data, total };
};

/** Counts grouped by status */
export const professorReviewArtifactCounts = async (): Promise<
  Record<AppStatus, number>
> => {
  const res = await api.get<Record<AppStatus, number>>(
    "/professor/dashboard/review-artifacts/counts"
  );
  return res.data;
};

/** Accept a submission */
export const professorAcceptArtifact = async (
  submissionId: number
): Promise<void> => {
  await api.post(
    `/professor/dashboard/review-artifacts/${submissionId}/accept`,
    {}
  );
};

/** Reject a submission (requires reason) */
export const professorRejectArtifact = async (
  submissionId: number,
  reason: string
): Promise<void> => {
  await api.post(
    `/professor/dashboard/review-artifacts/${submissionId}/reject`,
    { reason }
  );
};

/* ------------------------------- Profile API ------------------------------- */

export interface ProfileDto {
  username: string;
  email: string;
  profilePicture?: string | null; // server path like "/files/abc.jpg" or full URL
}

/** Get current user's profile for edit screen */
export const getMyProfile = async (opts?: {
  signal?: AbortSignal;
}): Promise<ProfileDto> => {
  const res = await api.get<ProfileDto>("/profile/edit", {
    signal: opts?.signal as any,
  });
  return res.data;
};

/**
 * Update current user's profile.
 * - Expects multipart/form-data with:
 *   - "profile": JSON string (username, email, and optional profilePicture: null to remove)
 *   - "file": image binary (optional)
 */
export const updateMyProfile = async (
  formData: FormData
): Promise<ProfileDto> => {
  const res = await api.put<ProfileDto>("/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
  return res.data;
};

/* ------------------------------ Profile (view) ------------------------------ */

export type Role = "visitor" | "curator" | "professor" | "admin";

export interface ViewUserProfile {
  username: string;
  email: string;
  profilePicture: string | null; // server path like "/files/abc.jpg" or absolute URL
  fullName: string;
  role: Role;
}

/** Get the current user's profile for view page */
export const getMyPublicProfile = async (opts?: {
  signal?: AbortSignal;
}): Promise<ViewUserProfile> => {
  const res = await api.get<ViewUserProfile>("/profile", {
    signal: opts?.signal as any,
    withCredentials: true,
  });
  return res.data;
};

/* ----------------------------- Notifications ------------------------------ */

export interface NotificationDto {
  notiId: number;
  notificationType: string;
  relatedType?: string | null;
  relatedId?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO
  source?: { username?: string | null } | null;
}

/** List current user's notifications */
export const listNotifications = async (opts?: {
  signal?: AbortSignal;
  unreadOnly?: boolean;
}): Promise<NotificationDto[]> => {
  const res = await api.get<NotificationDto[]>("/notifications", {
    params: { unreadOnly: opts?.unreadOnly ?? false },
    signal: opts?.signal as any,
    withCredentials: true,
  });
  return res.data;
};

/** Mark all notifications as read */
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.put("/notifications/mark-all-read", undefined, {
    withCredentials: true,
  });
};

// (Optional) mark a single notification as read if you add UI later
export const markNotificationRead = async (id: number): Promise<void> => {
  await api.put(`/notifications/${id}/read`, undefined, {
    withCredentials: true,
  });
};
