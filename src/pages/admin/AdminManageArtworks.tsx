import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
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
import {
  AdminArtworkDto,
  adminDeleteArtwork,
  adminListArtworks,
  PageResponse,
} from "@/services/api";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
export const ManageArtworks = () => {
  const navigate = useNavigate();
    const { user, ready } = useAuthGuard();
  const [pageIndex, setPageIndex] = useState(1); // 1-based for UI
  const [pageSize] = useState(10);
  const [data, setData] = useState<PageResponse<AdminArtworkDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");


  const loadPage = async (uiPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListArtworks(uiPage - 1, pageSize);
      setData(res);
    } catch (e) {
      setError("Failed to load artworks");
    } finally {
      setLoading(false);
    }
  };



     useEffect(() => {
    if (!ready) return;

    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "admin") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);
  useEffect(() => {
    loadPage(pageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  const handleViewDetails = (id: string) => {
    navigate(`/artwork/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteArtwork(id);
      // If the last item on the page was removed and page becomes empty, go back a page if possible
      const remaining = (data?.content.length ?? 1) - 1;
      if (remaining <= 0 && pageIndex > 1) {
        setPageIndex(pageIndex - 1);
      } else {
        await loadPage(pageIndex);
      }
    } catch (e) {
      // Optional: show toast
      console.error("Failed to delete artwork", e);
    }
  };

  const artworks = (data?.content ?? []).filter(
    (a) =>
      (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.uploaded_by || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = data?.totalPages ?? 0;

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
          <div className="flex items-center justify-between gap-3">
            <CardTitle>All Artworks</CardTitle>
            <div className="w-72">
              <Input
                placeholder="Search title, curator, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && artworks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-sm text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && artworks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-sm text-muted-foreground"
                    >
                      No artworks found.
                    </TableCell>
                  </TableRow>
                )}
                {artworks.map((artwork) => (
                  <TableRow key={artwork._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={artwork.image_url || "/default-artifact.png"}
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
                          onClick={() => handleDelete(artwork._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (pageIndex > 1) setPageIndex(pageIndex - 1);
                      }}
                      className={
                        pageIndex === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPageIndex(page);
                          }}
                          isActive={pageIndex === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (pageIndex < totalPages) setPageIndex(pageIndex + 1);
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
    </div>
  );
};
