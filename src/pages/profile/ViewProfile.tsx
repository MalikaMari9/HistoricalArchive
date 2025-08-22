import { useEffect, useState } from "react";
import { ArrowLeft, Edit, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/hooks/useAuth";

const prettyRole = (r: string) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "");

function toAbsoluteMediaUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `http://localhost:8080${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export default function ViewProfile() {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useAuth();

  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/signin", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

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

  if (!user) return null;

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

          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                {imgOk && user.profilePicture ? (
                  <AvatarImage
                    src={toAbsoluteMediaUrl(user.profilePicture)}
                    alt={user.username}
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

            <div className="space-y-4">
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
