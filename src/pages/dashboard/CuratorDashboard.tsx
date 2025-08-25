import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload, MessageSquare, Image, PlusCircle, Clock, CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  curatorListArtworks,
  curatorGetStats,
  getRecentCommentsForCurator,
  CuratorArtworkItem,
  CuratorStats,
  RecentCommentDTO,
} from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import axios, { AxiosError } from "axios";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type ArtworkRow = {
  id: number;
  title: string;
  status: "accepted" | "pending" | "rejected";
  date: string;
};

export default function CuratorDashboard() {
  useAuthGuard();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [myArtworks, setMyArtworks] = useState<ArtworkRow[]>([]);
  const [stats, setStats] = useState<CuratorStats>({
    totalArtworks: 0,
    pendingArtworks: 0,
    approvedArtworks: 0,
    rejectedArtworks: 0,
  });
  const [recentComments, setRecentComments] = useState<RecentCommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    []
  );

  // Redirect if not curator
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role !== "curator") {
      navigate("/403", { replace: true });
    }
  }, [user, authLoading, isAuthenticated, navigate]);

  // Load curator data
  useEffect(() => {
    if (authLoading || !isAuthenticated || user?.role !== "curator") return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [artworksData, statsData, commentsData] = await Promise.all([
          curatorListArtworks(),
          curatorGetStats(),
          getRecentCommentsForCurator(),
        ]);

        const rows: ArtworkRow[] = artworksData.map((art: CuratorArtworkItem) => {
          const normalized =
            (art.status?.toString().toLowerCase() as ArtworkRow["status"]) || "pending";
          const date = art.submissionDate ? dateFmt.format(new Date(art.submissionDate)) : "";
          return {
            id: art.id,
            title: art.title,
            status:
              normalized === "accepted" || normalized === "pending" || normalized === "rejected"
                ? normalized
                : "pending",
            date,
          };
        });

        setMyArtworks(rows);
        setStats(statsData);
        setRecentComments(commentsData);
      } catch (e) {
        const ax = e as AxiosError;
        if (axios.isAxiosError(ax) && ax.response && (ax.response.status === 401 || ax.response.status === 403)) {
          return;
        }

        setError(e instanceof Error ? e.message : "Failed to load curator dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, user, isAuthenticated, dateFmt]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Session expired</h2>
          <p className="text-muted-foreground">
            Please sign in again to access your curator dashboard.
          </p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center p-4 border border-red-500 rounded-lg max-w-md">
          <p className="font-medium">Error loading dashboard data</p>
          <p className="text-sm mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Curator Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Manage your artwork submissions and engage with the community
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <PlusCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <CardTitle>Upload New Art</CardTitle>
              <CardDescription>Submit a new artwork for review</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/curator/upload">
                <Button className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Artwork
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Image className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <CardTitle>My Artworks</CardTitle>
              <CardDescription>View and manage your submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/curator/artworks">
                <Button variant="outline" className="w-full">
                  View All ({stats.totalArtworks})
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-2" />
              <CardTitle>Discussions</CardTitle>
              <CardDescription>Engage with other curators</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/curator/discussions">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Join Discussions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.totalArtworks}</div>
              <p className="text-sm text-blue-600">Total Artworks</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.pendingArtworks}</div>
              <p className="text-sm text-yellow-600">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.approvedArtworks}</div>
              <p className="text-sm text-green-600">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.rejectedArtworks}</div>
              <p className="text-sm text-red-600">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* My Artworks + Comments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>My Submitted Artworks</CardTitle>
              <CardDescription>Track the status of your submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {myArtworks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions yet.</p>
                  <Link to="/curator/upload">
                    <Button variant="link" className="mt-2">
                      Upload your first artwork
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {myArtworks.map((artwork) => (
                    <div
                      key={artwork.id}
                      className="flex items-center justify-between p-3 bg-surface/50 rounded-lg hover:bg-surface/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{artwork.title}</p>
                        <p className="text-sm text-muted-foreground">{artwork.date}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {artwork.status === "accepted" && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {artwork.status === "pending" && (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        {artwork.status === "rejected" && (
                          <div className="h-4 w-4 rounded-full bg-red-600" />
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            artwork.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : artwork.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {artwork.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Recent Comments</CardTitle>
              <CardDescription>Latest feedback on your artworks</CardDescription>
            </CardHeader>
            <CardContent>
              {recentComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent comments on your artworks.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentComments.map((comment) => (
                    <div
                      key={comment.commentId}
                      className="p-3 bg-surface/50 rounded-lg border-l-4 border-blue-500 hover:bg-surface/70 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">
                                {comment.username?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <p className="font-medium text-sm">{comment.username}</p>
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{comment.comment}</p>
                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                            <span className="truncate">on {comment.artifactTitle}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to showcase more art?</h3>
                <p className="opacity-90">Upload your next masterpiece and share it with the community.</p>
              </div>
              <Link to="/curator/upload" className="mt-4 md:mt-0">
                <Button variant="secondary" className="whitespace-nowrap">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Upload New Artwork
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}