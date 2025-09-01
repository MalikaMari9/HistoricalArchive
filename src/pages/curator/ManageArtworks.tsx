import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Eye, Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  listMyArtworks,
  deleteArtifact,
  MyArtworkDTO,
  PageResponse,
  getMyArtworkStats,
} from "@/services/api";

type AppStatus = "pending" | "accepted" | "rejected";

export const ManageArtworks = () => {
  const { user, ready } = useAuthGuard();
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
  if (location.state?.reload) {
    // Force full refresh
    setPage(0); // optional: reset to first page
    setSearchTerm(""); // optional: clear search
    setStatusFilter("all"); // optional: clear filters
  }
}, [location.state]);

  useEffect(() => {
    if (ready && user?.role !== "curator") {
      navigate("/403");
    }
  }, [ready, user, navigate]);

  const [artworks, setArtworks] = useState<MyArtworkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<"all" | AppStatus>("all");

  const [page, setPage] = useState(0);
  const pageSize = 6;
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    pending: 0,
    rejected: 0,
  });

  
  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0); // reset page when search changes
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch data (artworks + stats)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res: PageResponse<MyArtworkDTO> = await listMyArtworks(
          page,
          pageSize,
          debouncedSearchTerm,
          statusFilter
        );

        const normalized = (res.content || []).map((raw) => {
          const image_url =
            raw.image_url?.trim() || raw.images?.[0]?.baseimageurl?.trim() || "";
          return { ...raw, image_url };
        });

        setArtworks(normalized);
        setTotalPages(res.totalPages ?? 1);

        const statsRes = await getMyArtworkStats();
        setStats(statsRes);
      } catch (err: any) {
        console.error("Failed to fetch artworks:", err);
        if (err?.response?.status === 401) {
          setError("You must be logged in as a curator to view your artworks.");
        } else {
          setError("Failed to fetch artworks. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, debouncedSearchTerm, statusFilter]);

  const getBestImageUrl = (a: MyArtworkDTO): string => {
    const fromImageUrl = a.image_url?.trim();
    const fromImages = a.images?.[0]?.baseimageurl?.trim();
    return fromImageUrl || fromImages || "/placeholder-art.jpg";
  };

  const getStatusColor = (status: AppStatus) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const handleEdit = (id: string) => navigate(`/curator/artworks/edit/${id}`);
  const handleView = (id: string) => navigate(`/artwork/${id}`);

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this artwork? This action cannot be undone."
      )
    )
      return;

    try {
      await deleteArtifact(id);
      setArtworks((prev) => prev.filter((a) => a._id !== id));
      // refresh stats after deletion (optional, but keeps header accurate)
      const statsRes = await getMyArtworkStats();
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to delete artwork:", err);
      setError("Failed to delete artwork. Please try again.");
    }
  };

  if (error)
    return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Artworks</h1>
          <p className="text-muted-foreground mt-2">
            Manage your uploaded artworks, edit details, and track performance
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Artworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.accepted}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Search + Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Artworks</CardTitle>
          <CardDescription>
            View and manage all your uploaded artworks
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search artworks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "all" | AppStatus);
                setPage(0); // reset page when filter changes
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Loading your artworks...
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artwork</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avg. Rating</TableHead>
                      <TableHead>Total Ratings</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {artworks.length > 0 ? (
                      artworks.map((art) => {
                        const status = (art.status?.toLowerCase() ||
                          "pending") as AppStatus;
                        const dateStr = art.uploaded_at
                          ? new Date(art.uploaded_at).toLocaleDateString()
                          : "—";

                        return (
                          <TableRow key={art._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={getBestImageUrl(art)}
                                  alt={art.title}
                                  className="w-12 h-12 rounded-md object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      "/placeholder-art.jpg";
                                  }}
                                />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium text-foreground">
                                {art.title}
                              </div>
                            </TableCell>

                            <TableCell>{art.category ?? "—"}</TableCell>

                            <TableCell>
                              <Badge className={getStatusColor(status)}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {(art.averageRating ?? 0).toFixed(1)}
                            </TableCell>

                            <TableCell>{art.totalRatings ?? 0}</TableCell>

                            <TableCell>{dateStr}</TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(art._id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(art._id)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(art._id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No artworks found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(p - 1, 0));
                      }}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) =>
                          p + 1 < totalPages ? p + 1 : p
                        );
                      }}
                      disabled={page + 1 >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
