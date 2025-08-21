import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Edit, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import { getMyPublicProfile, type ViewUserProfile } from "@/services/api";

/**
 * Role types for display. (Kept here in case your backend sends a string union.)
 */
type Role = "visitor" | "curator" | "professor" | "admin";

/* ------------------------------- Utilities -------------------------------- */

// Turn "/files/abc.jpg" or "http(s)://..." into an absolute URL we can render.
function toAbsoluteMediaUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  // Adjust host/port/env as needed
  return `http://localhost:8080${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

// Capitalize the role for display
const prettyRole = (r: string) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "");

/* -------------------------------- Component -------------------------------- */

export default function ViewProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<ViewUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // axios-based helper (handles credentials + baseURL)
        const data = await getMyPublicProfile({ signal: ac.signal });

        // Normalize image URL for <AvatarImage />
        const pic = data.profilePicture ? toAbsoluteMediaUrl(data.profilePicture) : "";

        setUser({ ...data, profilePicture: pic });
        setImgOk(Boolean(pic));
      } catch (err: any) {
        // If backend returns 401/403, punt to login
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          window.location.href = "/login";
          return;
        }
        if (err?.name !== "CanceledError") {
          setError(err?.message || "Failed to fetch profile");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  /* ------------------------------ Render: Load ------------------------------ */

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-24 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-32 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ------------------------------ Render: Error ----------------------------- */

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-muted">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Profile</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) return null;

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Arrow */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-muted">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Profile</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                {imgOk && user.profilePicture ? (
                  <AvatarImage
                    src={user.profilePicture}
                    alt={user.fullName || user.username}
                    className="object-cover"
                    onError={() => setImgOk(false)}
                  />
                ) : (
                  <AvatarFallback className="bg-muted">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* User Information */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg text-foreground">{user.fullName || "—"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Username</label>
                <p className="text-lg text-foreground">{user.username}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg text-foreground">{user.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-lg text-foreground">{prettyRole(user.role)}</p>
              </div>
            </div>

            {/* Edit Profile */}
            <div className="flex justify-center pt-4">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/profile/edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
