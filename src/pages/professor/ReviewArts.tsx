// src/pages/professor/ReviewArtifact.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle, X, Clock, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  AppStatus,
  ReviewArtifactDto,
  professorListReviewArtifacts,
  professorReviewArtifactCounts,
  professorAcceptArtifact,
  professorRejectArtifact,
} from "@/services/api";

type Status = AppStatus; // 'pending' | 'accepted' | 'rejected'
const PAGE_SIZE = 6;
const PLACEHOLDER_IMG = "/placeholder-art.jpg";

/* --------------------------------- Helpers --------------------------------- */

function getStatusBadge(status: Status) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <X className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// Normalize any image shape your backend may return.
function normalizeImages(art: ReviewArtifactDto): string[] {
  // Prefer "images" array with baseimageurl/image_url-like fields
  const fromArray =
    (art.images ?? [])
      .map((im) => (im as any)?.baseimageurl || (im as any)?.image_url || (im as any)?.url)
      .filter(Boolean) as string[];

  // Fallback to single image_url on root (some endpoints use this)
  const single = (art as any).image_url as string | undefined;

  const out = [...fromArray];
  if (!out.length && single) out.push(single);
  if (!out.length) out.push(PLACEHOLDER_IMG);
  return out;
}

function hasMeaningfulLocation(loc?: ReviewArtifactDto["location"]) {
  if (!loc) return false;
  const texts = [loc.river, loc.city, loc.region, loc.country, loc.continent]
    .filter((v) => typeof v === "string")
    .map((v) => (v as string).trim());
  const hasText = texts.some((t) => t.length > 0);
  const hasCoords =
    (typeof loc.latitude === "number" && !Number.isNaN(loc.latitude)) ||
    (typeof loc.longitude === "number" && !Number.isNaN(loc.longitude));
  return hasText || hasCoords;
}

function LocationBlock({ loc }: { loc?: ReviewArtifactDto["location"] }) {
  if (!hasMeaningfulLocation(loc)) return null;
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">Location</label>
      <ul className="list-disc list-inside text-sm">
        {loc?.river && <li>River: {loc.river}</li>}
        {loc?.city && <li>City: {loc.city}</li>}
        {loc?.region && <li>Region: {loc.region}</li>}
        {loc?.country && <li>Country: {loc.country}</li>}
        {loc?.continent && <li>Continent: {loc.continent}</li>}
        {typeof loc?.latitude === "number" && <li>Latitude: {loc.latitude}</li>}
        {typeof loc?.longitude === "number" && <li>Longitude: {loc.longitude}</li>}
      </ul>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Tiny <img> wrapper that gracefully falls back on error. */
function ImgWithFallback({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [current, setCurrent] = useState(src || PLACEHOLDER_IMG);
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setCurrent(PLACEHOLDER_IMG)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

/* -------------------------------- Component -------------------------------- */

export function ReviewArts() {
  const navigate = useNavigate();
  const {user, ready} = useAuthGuard();

  // deep-link params
  const [searchParams] = useSearchParams();
  const focusSubmissionId = searchParams.get("focusSubmissionId");
  const focusId = focusSubmissionId ? Number(focusSubmissionId) : null;
  const statusFromUrl = (searchParams.get("status") || "pending").toLowerCase() as Status;

  // UI states
  const [activeTab, setActiveTab] = useState<Status>(
    ["pending", "accepted", "rejected"].includes(statusFromUrl) ? statusFromUrl : "pending"
  );
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // pagination + data per tab
  const [pageByStatus, setPageByStatus] = useState<Record<Status, number>>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [totalByStatus, setTotalByStatus] = useState<Record<Status, number>>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [rowsByStatus, setRowsByStatus] = useState<Record<Status, ReviewArtifactDto[]>>({
    pending: [],
    accepted: [],
    rejected: [],
  });
  const [loadingByStatus, setLoadingByStatus] = useState<Record<Status, boolean>>({
    pending: false,
    accepted: false,
    rejected: false,
  });

  // selection/dialogs
  const [selected, setSelected] = useState<ReviewArtifactDto | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // abort controllers to avoid race conditions
  const aborters = useRef<Record<string, AbortController | null>>({});

useEffect(() => {
  if (!ready) return;

  if (!user) {
    // session expired or not logged in at all
    navigate("/signin", { replace: true });
  } else if (user.role !== "professor") {
    // logged in, but not a professor
    navigate("/403", { replace: true });
  }
}, [ready, user, navigate]);



  // one-time flash style
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .flash-highlight { animation: rowFlash 2s ease-in-out 1; }
      @keyframes rowFlash {
        0% { background-color: rgba(59,130,246,0.25); }
        50% { background-color: rgba(59,130,246,0.15); }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  /* ------------------------------- Data loads ------------------------------- */

  const loadCounts = async () => {
    try {
      const counts = await professorReviewArtifactCounts();
      setTotalByStatus({
        pending: counts.pending ?? 0,
        accepted: counts.accepted ?? 0,
        rejected: counts.rejected ?? 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadPage = async (status: Status, page = 0, opts?: { afterRenderScrollToId?: number }) => {
    // cancel inflight for this status
    const key = `page-${status}`;
    aborters.current[key]?.abort();
    const ac = new AbortController();
    aborters.current[key] = ac;

    setLoadingByStatus((p) => ({ ...p, [status]: true }));
    try {
      const { content, total } = await professorListReviewArtifacts(status, page, PAGE_SIZE, { signal: ac.signal });
      setRowsByStatus((p) => ({ ...p, [status]: content }));
      setTotalByStatus((p) => ({ ...p, [status]: total }));
      setPageByStatus((p) => ({ ...p, [status]: page }));

      if (opts?.afterRenderScrollToId) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`row-${opts.afterRenderScrollToId}`);
          if (el) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            setHighlightId(opts.afterRenderScrollToId!);
            setTimeout(() => setHighlightId(null), 2500);
          }
        });
      }
    } catch (e) {
      if ((e as any)?.name !== "CanceledError") console.error(e);
    } finally {
      setLoadingByStatus((p) => ({ ...p, [status]: false }));
    }
  };

  // initial: load counts + initial tab page (respect deep link)
  useEffect(() => {
    loadCounts();
    if (focusId) {
      loadPage(activeTab, 0, { afterRenderScrollToId: focusId });
    } else {
      loadPage(activeTab, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when switching tabs, fetch if empty
  useEffect(() => {
    if (rowsByStatus[activeTab].length === 0 && !loadingByStatus[activeTab]) {
      loadPage(activeTab, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ---------------------------- Action handlers ---------------------------- */

  const handleApprove = async (submissionId: number) => {
    try {
      await professorAcceptArtifact(submissionId);
      setSelected(null);
      // reload current tab page
      await loadPage(activeTab, pageByStatus[activeTab]);
      await loadCounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (submissionId: number) => {
    try {
      await professorRejectArtifact(submissionId, rejectReason);
      setRejectReason("");
      setSelected(null);
      setIsRejectOpen(false);

      // compute a safe page if removing last item
      const newTotal = Math.max(0, (totalByStatus[activeTab] || 0) - 1);
      const lastPage = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      const target = Math.min(pageByStatus[activeTab], lastPage);

      await loadPage(activeTab, target);
      await loadCounts();
    } catch (e) {
      console.error(e);
    }
  };

  /* --------------------------- Pagination controls -------------------------- */

  const totalPagesFor = (s: Status) => Math.max(1, Math.ceil((totalByStatus[s] || 0) / PAGE_SIZE));
  const canPrev = (s: Status) => (pageByStatus[s] || 0) > 0;
  const canNext = (s: Status) => (pageByStatus[s] || 0) + 1 < totalPagesFor(s);

  function Pagination({ status }: { status: Status }) {
    const pageIndex = pageByStatus[status] || 0;
    const totalPages = totalPagesFor(status);
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing page <span className="font-medium">{pageIndex + 1}</span> of{" "}
          <span className="font-medium">{totalPages}</span> — total {totalByStatus[status]} items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(status, pageIndex - 1)}
            disabled={!canPrev(status)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(status, pageIndex + 1)}
            disabled={!canNext(status)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  /* --------------------------------- Tables -------------------------------- */

  function ArtTable({ status, arts, loading }: { status: Status; arts: ReviewArtifactDto[]; loading: boolean }) {
    if (loading && arts.length === 0) {
      return (
        <div className="p-6 text-sm text-muted-foreground">
          Loading {status} submissions…
        </div>
      );
    }
    if (!loading && arts.length === 0) {
      return (
        <div className="p-6 text-sm text-muted-foreground">
          No {status} submissions.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Artwork</TableHead>
            <TableHead>Curator</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {arts.map((art) => {
            const imgs = normalizeImages(art);
            const first = imgs[0];

            return (
              <TableRow
                key={art.submissionId}
                id={`row-${art.submissionId}`}
                className={highlightId === art.submissionId ? "flash-highlight" : ""}
              >
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded overflow-hidden">
                      <ImgWithFallback src={first} alt={art.title} className="w-12 h-12 object-cover" />
                    </div>
                    <div>
                      <p className="font-medium">{art.title}</p>
                      {art.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[220px]">{art.description}</p>
                      )}
                      {imgs.length > 1 && (
                        <p className="text-xs text-muted-foreground">+{imgs.length - 1} more</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{art.curatorUsername}</TableCell>
                <TableCell>{art.category}</TableCell>
                <TableCell>{formatDate(art.submittedAt)}</TableCell>
                <TableCell>{getStatusBadge((art.status as Status) ?? "pending")}</TableCell>
                <TableCell>
                  <div className="flex flex-nowrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(art);
                        setSelectedImageIndex(0);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>

                    {art.status === "pending" && (
                      <>
                        {/* Accept inline dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => setSelected(art)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Accept Artwork</DialogTitle>
                            </DialogHeader>
                            {selected && (
                              <div className="space-y-4">
                                <p>
                                  Are you sure you want to accept “{selected.title}” by {selected.curatorUsername}?
                                </p>
                                <div className="flex space-x-2">
                                  <Button onClick={() => handleApprove(selected.submissionId)} className="flex-1">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Acceptance
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Reject uses a global dialog to avoid unmount issues */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelected(art);
                            setRejectReason("");
                            setIsRejectOpen(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  /* --------------------------------- Titles -------------------------------- */

  const tabTitles = useMemo(
    () => ({
      pending: `Pending (${totalByStatus.pending})`,
      accepted: `Accepted (${totalByStatus.accepted})`,
      rejected: `Rejected (${totalByStatus.rejected})`,
    }),
    [totalByStatus]
  );

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/professor")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Review Art Submissions</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Art Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">{tabTitles.pending}</TabsTrigger>
                <TabsTrigger value="accepted">{tabTitles.accepted}</TabsTrigger>
                <TabsTrigger value="rejected">{tabTitles.rejected}</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                <ArtTable
                  status="pending"
                  arts={rowsByStatus.pending}
                  loading={loadingByStatus.pending}
                />
                <Pagination status="pending" />
              </TabsContent>

              <TabsContent value="accepted" className="mt-6">
                <ArtTable
                  status="accepted"
                  arts={rowsByStatus.accepted}
                  loading={loadingByStatus.accepted}
                />
                <Pagination status="accepted" />
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                <ArtTable
                  status="rejected"
                  arts={rowsByStatus.rejected}
                  loading={loadingByStatus.rejected}
                />
                <Pagination status="rejected" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Global Reject dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Artwork</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <p>
                  Are you sure you want to reject “{selected.title}” by {selected.curatorUsername}?
                </p>
                <div className="space-y-2">
                  <Label htmlFor="rejectComment">Rejection Reason (Required)</Label>
                  <Textarea
                    id="rejectComment"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason for rejection…"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!rejectReason.trim()}
                    onClick={() => handleReject(selected.submissionId)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Details dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Artwork Details</DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="space-y-6">
                {/* Images */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Artwork Images</h4>
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <ImgWithFallback
                      src={normalizeImages(selected)[selectedImageIndex || 0]}
                      alt={selected.title}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() =>
                        window.open(normalizeImages(selected)[selectedImageIndex || 0], "_blank")
                      }
                    />
                  </div>
                  {normalizeImages(selected).length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {normalizeImages(selected).map((image, idx) => (
                        <div
                          key={idx}
                          className={`cursor-pointer group relative overflow-hidden rounded border-2 transition-all duration-300 ${
                            (selectedImageIndex || 0) === idx
                              ? "border-primary shadow-lg"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => setSelectedImageIndex(idx)}
                        >
                          <ImgWithFallback
                            src={image}
                            alt={`${selected.title} view ${idx + 1}`}
                            className="w-full h-20 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {(selectedImageIndex || 0) === idx && (
                            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Title</label>
                      <p className="text-lg font-semibold">{selected.title}</p>
                    </div>
                    {selected.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="text-sm">{selected.description}</p>
                      </div>
                    )}
                    {selected.dimension && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Dimension</label>
                        <p className="text-sm">{selected.dimension}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="text-sm">{selected.category}</p>
                    </div>
                    {!!(selected.tags && selected.tags.length) && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tags</label>
                        <p className="text-sm">{selected.tags.join(", ")}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {selected.culture && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Culture</label>
                        <p className="text-sm">{selected.culture}</p>
                      </div>
                    )}
                    {selected.department && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Department</label>
                        <p className="text-sm">{selected.department}</p>
                      </div>
                    )}
                    {selected.period && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Period</label>
                        <p className="text-sm">{selected.period}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Exact Found Date</label>
                      <p className="text-sm">{selected.exact_found_date || ""}</p>
                    </div>
                    <LocationBlock loc={selected.location} />
                  </div>
                </div>

                {/* Submission Info */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">Submission Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Curator</label>
                      <p>{selected.curatorUsername}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Submitted Date</label>
                      <p>{formatDate(selected.submittedAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        {getStatusBadge((selected.status as Status) ?? "pending")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ReviewArts;
