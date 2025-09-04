import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  AdminArtworkDto,
  adminDeleteArtwork,
  adminListAllArtworks, // fetch ALL for counts
  adminListArtworksPaginated, // fetch with pagination
} from "@/services/api";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Minus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/** Status type for filtering */
type StatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "rejected"
;

export const ManageArtworks = () => {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();

  // dataset
  const [artworks, setArtworks] = useState<AdminArtworkDto[]>([]);
  const [allArtworks, setAllArtworks] = useState<AdminArtworkDto[]>([]); // for counting
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countsLoading, setCountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ui state
  const [pageIndex, setPageIndex] = useState(1); // 1-based UI
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] =
    useState<AdminArtworkDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // auth + initial load
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      navigate("/403", { replace: true });
      return;
    }

    loadArtworks();
    loadAllArtworksForCounts();
  }, [ready, user, navigate]);

  // reload when search or status filter changes
  useEffect(() => {
    if (!ready || !user) return;
    setPageIndex(1); // reset to first page
    loadArtworks();
  }, [debouncedSearch, statusFilter]);

  // reload when page changes
  useEffect(() => {
    if (!ready || !user) return;
    loadArtworks();
  }, [pageIndex]);

  const loadArtworks = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminListArtworksPaginated(
        pageIndex - 1, // API uses 0-based indexing
        pageSize,
        {
          q: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      );
      setArtworks(result.content);
      setTotalCount(result.total);
    } catch {
      setError("Failed to load artworks");
      setArtworks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load all artworks for status counts (separate from pagination)
  const loadAllArtworksForCounts = async () => {
    try {
      setCountsLoading(true);
      const allData = await adminListAllArtworks();
      console.log("📊 Loaded all artworks for counts:", allData.length);
      console.log(
        "📊 Sample artwork statuses:",
        allData.slice(0, 3).map((a) => ({
          id: a._id,
          title: a.title,
          status: a.status,
          calculatedStatus: getArtworkStatus(a),
        }))
      );
      setAllArtworks(allData);
    } catch (error) {
      console.error("Failed to load artwork counts:", error);
      setAllArtworks([]);
    } finally {
      setCountsLoading(false);
    }
  };

  // helpers
  function getArtworkStatus(
    artwork: AdminArtworkDto
  ): "pending" | "accepted" | "rejected" | "not_submitted" {
    const status = artwork.status?.toLowerCase();
    if (
      status === "pending" ||
      status === "accepted" ||
      status === "rejected" ||
      status === "not_submitted"
    ) {
      return status;
    }
    return "not_submitted";
  }

  // Counts for status pills (similar to ManageUsers)
  const statusCounts = useMemo(() => {
    let pending = 0,
      accepted = 0,
      rejected = 0,
      not_submitted = 0;

    console.log("🔢 Calculating counts for", allArtworks.length, "artworks");

    for (const artwork of allArtworks) {
      const status = getArtworkStatus(artwork);
      if (status === "pending") pending++;
      else if (status === "accepted") accepted++;
      else if (status === "rejected") rejected++;
      else if (status === "not_submitted") not_submitted++;
    }

    const counts = {
      pending,
      accepted,
      rejected,
      not_submitted,
      total: allArtworks.length,
    };

    console.log("🔢 Final counts:", counts);
    return counts;
  }, [allArtworks]);

  // calculate total pages from server response
  const totalPages = Math.ceil(totalCount / pageSize);

  // clamp pageIndex if list shrinks
  useEffect(() => {
    if (pageIndex > totalPages && totalPages > 0) setPageIndex(totalPages);
  }, [pageIndex, totalPages]);

  const handleViewDetails = (id: string) => {
    navigate(`/artwork/${id}`);
  };

  // open delete dialog
  const openDeletePrompt = (art: AdminArtworkDto) => {
    setSelectedForDelete(art);
    setIsDeleteOpen(true);
  };

  // confirm delete
  const confirmDelete = async () => {
    if (!selectedForDelete) return;
    setDeleting(true);
    try {
      await adminDeleteArtwork(selectedForDelete._id);
      setIsDeleteOpen(false);
      setSelectedForDelete(null);
      // Reload both paginated data and counts
      await loadArtworks();
      await loadAllArtworksForCounts();
    } catch (e) {
      console.error("Failed to delete artwork", e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Manage Artworks
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage all artworks uploaded by curators
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Artworks</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search + Status filter */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search artworks by title, curator, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status pills with counts */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                disabled={countsLoading}
              >
                All ({countsLoading ? "..." : statusCounts.total})
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                disabled={countsLoading}
              >
                <Clock className="h-4 w-4 mr-1" />
                Pending ({countsLoading ? "..." : statusCounts.pending})
              </Button>
              <Button
                variant={statusFilter === "accepted" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("accepted")}
                disabled={countsLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accepted ({countsLoading ? "..." : statusCounts.accepted})
              </Button>
              <Button
                variant={statusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("rejected")}
                disabled={countsLoading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejected ({countsLoading ? "..." : statusCounts.rejected})
              </Button>
            
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive mb-3">{error}</div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artwork</TableHead>
                  <TableHead>Curator</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && artworks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-sm text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && artworks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-sm text-muted-foreground"
                    >
                      No artworks found.
                    </TableCell>
                  </TableRow>
                )}

                {artworks.map((artwork) => {
                  const status = getArtworkStatus(artwork);
                  const imageUrl =
                    artwork.image_url ||
                    artwork.images?.[0]?.baseimageurl ||
                    "/default-artifact.png";

                  return (
                    <TableRow key={artwork._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={imageUrl}
                            alt={artwork.title}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                          <div>
                            <div className="font-medium text-foreground">
                              {artwork.title}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{artwork.uploaded_by || "-"}</TableCell>
                      <TableCell>{artwork.category || "-"}</TableCell>
                      <TableCell>
                        {status === "pending" ? (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            Pending
                          </Badge>
                        ) : status === "accepted" ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            Accepted
                          </Badge>
                        ) : status === "rejected" ? (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800"
                          >
                            Rejected
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-800"
                          >
                            Not Submitted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {artwork.uploaded_at
                          ? new Date(artwork.uploaded_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(artwork._id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeletePrompt(artwork)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent className="gap-4">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-label="Previous page"
                      onClick={(e) => {
                        e.preventDefault();
                        if (pageIndex > 1) setPageIndex((p) => p - 1);
                      }}
                      className={
                        pageIndex === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  <span className="text-sm text-muted-foreground select-none">
                    Page {pageIndex} of {totalPages}
                  </span>

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-label="Next page"
                      onClick={(e) => {
                        e.preventDefault();
                        if (pageIndex < totalPages) setPageIndex((p) => p + 1);
                      }}
                      className={
                        pageIndex === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog (modeled after your reject dialog) */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Artwork</DialogTitle>
          </DialogHeader>
          {selectedForDelete && (
            <div className="space-y-4">
              <p className="text-sm">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold">
                  “{selectedForDelete.title}”
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedForDelete.image_url ||
                    selectedForDelete.images?.[0]?.baseimageurl ||
                    "/default-artifact.png"
                  }
                  alt={selectedForDelete.title}
                  className="w-14 h-14 rounded object-cover"
                />
                <div className="text-sm text-muted-foreground">
                  <div>Curator: {selectedForDelete.uploaded_by || "-"}</div>
                  <div>Category: {selectedForDelete.category || "-"}</div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setSelectedForDelete(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
