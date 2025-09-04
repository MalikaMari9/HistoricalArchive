// src/pages/professor/ReviewArtifact.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  X,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
   MoreVertical,  
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const fromArray =
    (art.images ?? [])
      .map((im) => (im as any)?.baseimageurl || (im as any)?.image_url || (im as any)?.url)
      .filter(Boolean) as string[];
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
  const { user, ready } = useAuthGuard();

  // deep-link params
  const [searchParams] = useSearchParams();
  const focusSubmissionId = searchParams.get("focusSubmissionId");
  const focusId = focusSubmissionId ? Number(focusSubmissionId) : null;
  const statusFromUrl = (searchParams.get("status") || "pending").toLowerCase() as Status;
const [isAcceptOpen, setIsAcceptOpen] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState<Status>(
    ["pending", "accepted", "rejected"].includes(statusFromUrl) ? statusFromUrl : "pending"
  );
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // search + debounce
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

  // top summary cards counts (global)
  const [counts, setCounts] = useState<{ pending: number; accepted: number; rejected: number; total: number }>({
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0,
  });

  // selection/dialogs
  const [selected, setSelected] = useState<ReviewArtifactDto | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // abort controllers to avoid race conditions
  const aborters = useRef<Record<string, AbortController | null>>({});

  // auth gate
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "professor") {
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

  // global counts for summary cards
  const loadCounts = async () => {
    try {
      const c = await professorReviewArtifactCounts();
      setCounts({
        pending: c?.pending ?? 0,
        accepted: c?.accepted ?? 0,
        rejected: c?.rejected ?? 0,
        total: c?.total ?? (c?.accepted ?? 0) + (c?.rejected ?? 0),
      });
      // keep tab totals in sync initially; they’ll be overwritten by paged fetches (which include search filtering)
      setTotalByStatus({
        pending: c?.pending ?? 0,
        accepted: c?.accepted ?? 0,
        rejected: c?.rejected ?? 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAllTabs = async () => {
  await loadCounts();
  await loadPage("pending", pageByStatus["pending"]);
  await loadPage("accepted", pageByStatus["accepted"]);
  await loadPage("rejected", pageByStatus["rejected"]);
};


  const loadPage = async (status: Status, page = 0, opts?: { afterRenderScrollToId?: number }) => {
    const key = `page-${status}`;
    aborters.current[key]?.abort();
    const ac = new AbortController();
    aborters.current[key] = ac;

    setLoadingByStatus((p) => ({ ...p, [status]: true }));
    try {
      const { content, total } = await professorListReviewArtifacts(
        status,
        page,
        PAGE_SIZE,
        // IMPORTANT: ensure your API client forwards `q` to the backend
        { signal: ac.signal, q: debouncedSearch || undefined } as any
      );

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
    } catch (e: any) {
      if (e?.name !== "CanceledError") console.error(e);
    } finally {
      setLoadingByStatus((p) => ({ ...p, [status]: false }));
    }
  };

  // initial: load counts + first page
  useEffect(() => {
    if (!ready) return;
    loadCounts();
    if (focusId) {
      loadPage(activeTab, 0, { afterRenderScrollToId: focusId });
    } else {
      loadPage(activeTab, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // when switching tabs, fetch if empty (or refresh if you prefer)
  useEffect(() => {
    if (!ready) return;
    if (rowsByStatus[activeTab].length === 0 && !loadingByStatus[activeTab]) {
      loadPage(activeTab, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ready]);

  // when search changes, reset current tab to page 0 and fetch
  useEffect(() => {
    if (!ready) return;
    setPageByStatus((p) => ({ ...p, [activeTab]: 0 }));
    loadPage(activeTab, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, ready]);

  /* ---------------------------- Action handlers ---------------------------- */

const handleApprove = async (submissionId: number) => {
  try {
    await professorAcceptArtifact(submissionId);
    setSelected(null);
    setIsAcceptOpen(false); // <-- close here
    await refreshAllTabs();
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

      //await loadPage(activeTab, target);
      //await loadCounts();
      await refreshAllTabs();
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
      return <div className="p-6 text-sm text-muted-foreground">Loading {status} submissions…</div>;
    }
    if (!loading && arts.length === 0) {
      return <div className="p-6 text-sm text-muted-foreground">No {status} submissions.</div>;
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
            <TableHead>Details</TableHead>
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
</TableCell><TableCell>
                   {art.status === "pending" && (
  <div className="relative inline-flex group">
    {/* Always-visible kebab button */}
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreVertical className="h-4 w-4" />
      <span className="sr-only">Actions</span>
    </Button>

    {/* Hover-revealed panel */}
    <div
      className="
        absolute right-0 top-0 mt-9 w-44 z-20
        rounded-md border bg-popover p-2 shadow-md
        opacity-0 pointer-events-none
        transition-opacity duration-150
        group-hover:opacity-100 group-hover:pointer-events-auto
        group-focus-within:opacity-100 group-focus-within:pointer-events-auto
      "
    >
      {/* Accept (opens confirm dialog) */}
{/* Accept (opens GLOBAL dialog) */}
<Button
  size="sm"
  className="w-full justify-start mb-2"
  onClick={() => {
    setSelected(art);
    setIsAcceptOpen(true);
  }}
>
  <CheckCircle className="h-4 w-4 mr-2" />
  Accept
</Button>


      {/* Reject (opens existing global reject dialog) */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          setSelected(art);
          setRejectReason("");
          setIsRejectOpen(true);
        }}
      >
        <X className="h-4 w-4 mr-2" />
        Reject
      </Button>
    </div>
  </div>
)}
{art.status === "accepted" && (
  <div className="relative inline-flex group">
    {/* Always-visible kebab button */}
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreVertical className="h-4 w-4" />
      <span className="sr-only">Actions</span>
    </Button>

    {/* Hover-revealed panel */}
    <div
      className="
        absolute right-0 top-0 mt-9 w-44 z-20
        rounded-md border bg-popover p-2 shadow-md
        opacity-0 pointer-events-none
        transition-opacity duration-150
        group-hover:opacity-100 group-hover:pointer-events-auto
        group-focus-within:opacity-100 group-focus-within:pointer-events-auto
      "
    >
      {/* Revoke (reuses existing global reject dialog) */}
      <Button
        variant="destructive"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          setSelected(art);
          setRejectReason("");
          setIsRejectOpen(true);
        }}
      >
        <X className="h-4 w-4 mr-2" />
        Revoke 
      </Button>
    </div>
  </div>
)}

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

        {/* Stats Overview (artifacts) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{counts.accepted}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviewed</CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{counts.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Art Submissions</CardTitle>

            {/* Search bar */}
            <div className="mt-3 w-full md:w-96 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by title, category, tags…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">{tabTitles.pending}</TabsTrigger>
                <TabsTrigger value="accepted">{tabTitles.accepted}</TabsTrigger>
                <TabsTrigger value="rejected">{tabTitles.rejected}</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                <ArtTable status="pending" arts={rowsByStatus.pending} loading={loadingByStatus.pending} />
                <Pagination status="pending" />
              </TabsContent>

              <TabsContent value="accepted" className="mt-6">
                <ArtTable status="accepted" arts={rowsByStatus.accepted} loading={loadingByStatus.accepted} />
                <Pagination status="accepted" />
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                <ArtTable status="rejected" arts={rowsByStatus.rejected} loading={loadingByStatus.rejected} />
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
        {/* Global Accept dialog */}
<Dialog
  open={isAcceptOpen}
  onOpenChange={(open) => {
    setIsAcceptOpen(open);
    if (!open) setSelected(null);
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Accept Artwork</DialogTitle>
    </DialogHeader>

    {selected && (
      <div className="space-y-4">
        <p>
          Are you sure you want to accept “{selected.title}” by {selected.curatorUsername}?
        </p>

        <div className="flex items-center gap-3">
          <img
            src={
              normalizeImages(selected)[0] || "/placeholder-art.jpg"
            }
            alt={selected.title}
            className="w-14 h-14 rounded object-cover"
          />
          <div className="text-sm text-muted-foreground">
            <div>Category: {selected.category || "-"}</div>
            <div>Submitted: {formatDate(selected.submittedAt)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAcceptOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleApprove(selected.submissionId)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Acceptance
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>


        {/* View Details dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">

            <DialogHeader>
              <DialogTitle>Artwork Details</DialogTitle>
            </DialogHeader>

{selected && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* LEFT: Image panel */}
    <div className="space-y-4 md:sticky md:top-0 self-start">
      <h4 className="font-semibold">Artwork Images</h4>

      <div className="w-full rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        <ImgWithFallback
          src={normalizeImages(selected)[selectedImageIndex || 0]}
          alt={selected.title}
          className="max-h-[70vh] max-w-full w-auto h-auto object-contain cursor-zoom-in"
          onClick={() =>
            window.open(normalizeImages(selected)[selectedImageIndex || 0], "_blank")
          }
        />
      </div>

      {normalizeImages(selected).length > 1 && (
        <div className="grid grid-cols-5 gap-2">
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

    {/* RIGHT: Metadata panel */}
    <div className="space-y-6">
      {/* Basic Info (kept as 2 sub-columns for readability) */}
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
  </div>
)}

          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ReviewArts;
