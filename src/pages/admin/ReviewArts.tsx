import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminApproveReview,
  adminListPendingReviews,
  adminRejectReview,
  type PendingUserArtifact,
} from "@/services/api";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  MessageSquare,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function ReviewArts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<PendingUserArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminListPendingReviews();
      setItems(data);
    } catch (e) {
      setError("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredArtworks = useMemo(
    () =>
      items.filter(
        (artwork) =>
          artwork.artifactId
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(artwork.userId).includes(searchQuery)
      ),
    [items, searchQuery]
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await adminApproveReview(id);
      await load();
    } catch (e) {
      alert("Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("Reason (optional)") ?? undefined;
    try {
      await adminRejectReview(id, reason);
      await load();
    } catch (e) {
      alert("Failed to reject");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-primary">Review Arts</h1>
            <p className="text-muted-foreground text-lg">
              Review and manage artwork submissions
            </p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Artwork Submissions</CardTitle>
            <CardDescription>
              Review curator submissions and manage approval status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search artworks by title, curator, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Artworks Table */}
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artwork</TableHead>
                    <TableHead>Curator</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="text-sm text-muted-foreground">
                          Loading submissions…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="text-sm text-destructive">{error}</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    !error &&
                    filteredArtworks.map((artwork) => (
                      <TableRow key={artwork.userArtifactId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">
                                Artifact {artwork.artifactId}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                User #{artwork.userId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(artwork.status)}
                          >
                            {artwork.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(artwork.savedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {artwork.status === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    handleApprove(artwork.userArtifactId)
                                  }
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleReject(artwork.userArtifactId)
                                  }
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {filteredArtworks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No artworks found matching your search.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
