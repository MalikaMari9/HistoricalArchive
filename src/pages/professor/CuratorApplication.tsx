import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Download,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  MoreVertical,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  professorApproveCuratorApp,
  professorRejectCuratorApp,
  professorFullReviewStats,
  professorListReviewCuratorApplications,
  getCuratorEmailByApplicationId,
  type ReviewCuratorAppDto,
  type AppStatus, // "pending" | "accepted" | "rejected"
} from "@/services/api";

const PAGE_SIZE = 8;

export default function CuratorApplications() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();
  const { id: focusIdParam } = useParams();
  const focusId = focusIdParam ? Number(focusIdParam) : null;

  // Tabs & selection
  const [activeTab, setActiveTab] = useState<AppStatus>("pending");
  const [selected, setSelected] = useState<ReviewCuratorAppDto | null>(null);

  // Dialog controls
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
const [emailMap, setEmailMap] = useState<Record<number, string>>({});

  // Per-tab paging/data
  const [pageByStatus, setPageByStatus] = useState<Record<AppStatus, number>>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [rowsByStatus, setRowsByStatus] = useState<Record<AppStatus, ReviewCuratorAppDto[]>>({
    pending: [],
    accepted: [],
    rejected: [],
  });
  const [totalByStatus, setTotalByStatus] = useState<Record<AppStatus, number>>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [loadingByStatus, setLoadingByStatus] = useState<Record<AppStatus, boolean>>({
    pending: false,
    accepted: false,
    rejected: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Count cards (from backend)
  const [counts, setCounts] = useState<{ pending: number; accepted: number; rejected: number; total: number }>(
    { pending: 0, accepted: 0, rejected: 0, total: 0 }
  );

  // Misc UI
  const [rejectionReason, setRejectionReason] = useState("");
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Search (debounced)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Abort controllers per tab (avoid races)
  const aborters = useRef<Record<string, AbortController | null>>({});

  // Date formatter
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }),
    []
  );

  /* ───────────────────────────── Auth guard ───────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "professor") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);

  /* ─────────────────────────── Counts (cards) ─────────────────────────── */
  async function loadCounts() {
    try {
      const s = await professorFullReviewStats();
      const cur = s?.curator || { pending: 0, accepted: 0, rejected: 0, total: 0 };
      setCounts({
        pending: Number(cur.pending) || 0,
        accepted: Number(cur.accepted) || 0,
        rejected: Number(cur.rejected) || 0,
        total: Number(cur.total) || 0,
      });
    } catch {
      /* non-blocking */
    }
  }

  /* ─────────────────────────── Paged list fetch ───────────────────────── */
  async function loadPage(status: AppStatus, page = 0) {
    const key = `cur-${status}`;
    aborters.current[key]?.abort(); // cancel in-flight for this tab
    const ac = new AbortController();
    aborters.current[key] = ac;

    setLoadingByStatus((p) => ({ ...p, [status]: true }));
    setError(null);

    try {
      const { content, total } = await professorListReviewCuratorApplications(status, page, PAGE_SIZE, {
        q: debouncedSearch || undefined,
        signal: ac.signal,
      });
      setRowsByStatus((p) => ({ ...p, [status]: content }));
      setTotalByStatus((p) => ({ ...p, [status]: total }));
      setPageByStatus((p) => ({ ...p, [status]: page }));
    } catch (e: any) {
      if (e?.name !== "AbortError" && e?.name !== "CanceledError") {
        setError("Failed to fetch curator applications");
      }
    } finally {
      setLoadingByStatus((p) => ({ ...p, [status]: false }));
    }
  }

  // Cleanup aborters on unmount
  useEffect(() => {
    return () => {
      Object.values(aborters.current).forEach((ac) => ac?.abort());
    };
  }, []);

  /* ─────────── Single source of truth: (ready, tab, search) ⇒ fetch page 0 ─────────── */
  useEffect(() => {
    if (!ready) return;
    setPageByStatus((p) => ({ ...p, [activeTab]: 0 }));
    loadPage(activeTab, 0);
    // also refresh cards (optional—comment out if you want counts independent of search)
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeTab, debouncedSearch]);

  /* ───────────────────────────── Focus highlight ──────────────────────── */
  useEffect(() => {
    if (!focusId) return;
    const exists = rowsByStatus[activeTab].some((a) => a.applicationId === focusId);
    if (!exists) return;
    const t = requestAnimationFrame(() => {
      const el = document.getElementById(`row-${focusId}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setHighlightId(focusId);
        setTimeout(() => setHighlightId(null), 2000);
      }
    });
    return () => cancelAnimationFrame(t);
  }, [focusId, activeTab, rowsByStatus]);

  /* ────────────────────────────── Actions ─────────────────────────────── */
  async function handleApprove(id: number) {
    try {
      await professorApproveCuratorApp(id);
      toast({ title: "Approved!", description: `Application #${id} was approved.` });

      // Recompute safe page if removal empties current page
      const newTotal = Math.max(0, (totalByStatus[activeTab] || 0) - 1);
      const lastPage = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      const target = Math.min(pageByStatus[activeTab] || 0, lastPage);

      await loadPage(activeTab, target);
      await loadCounts();

      setShowApproveDialog(false);
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Approval failed", variant: "destructive" });
    }
  }

  async function handleReject(id: number, reason: string) {
    try {
      await professorRejectCuratorApp(id, reason);
      toast({ title: "Rejected!", description: `Application #${id} was rejected.` });

      const newTotal = Math.max(0, (totalByStatus[activeTab] || 0) - 1);
      const lastPage = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      const target = Math.min(pageByStatus[activeTab] || 0, lastPage);

      await loadPage(activeTab, target);
      await loadCounts();

      setShowRejectDialog(false);
      setRejectionReason("");
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Rejection failed", variant: "destructive" });
    }
  }

  /* ───────────────────────────── UI helpers ───────────────────────────── */
  function StatusBadge({ status }: { status: AppStatus }) {
    if (status === "pending") {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    if (status === "accepted") {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Accepted</Badge>;
    }
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
  }

  function Pagination({ status }: { status: AppStatus }) {
    const total = totalByStatus[status] || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = pageByStatus[status] || 0;
    const canPrev = page > 0;
    const canNext = page + 1 < totalPages;

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing page <span className="font-medium">{page + 1}</span> of{" "}
          <span className="font-medium">{totalPages}</span> — total {total} items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(status, Math.max(0, page - 1))}
            disabled={!canPrev}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(status, page + 1)}
            disabled={!canNext}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  function AppsTable({ status }: { status: AppStatus }) {
    const rows = rowsByStatus[status] || [];
    const loading = loadingByStatus[status];
    const showActions = status === "pending";

    if (loading && rows.length === 0) {
      return (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7}>Loading {status} curator applications…</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (error) {
      return (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-destructive">
                {error}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (!loading && rows.length === 0) {
      return (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7}>No {status} curator applications.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Educational Background</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((app) => (
            <TableRow
              key={app.applicationId}
              id={`row-${app.applicationId}`}
              className={
                highlightId === app.applicationId
                  ? "ring-2 ring-primary/60 transition-[box-shadow] duration-700"
                  : ""
              }
            >
              <TableCell className="font-medium">{app.fname}</TableCell>
              <TableCell>{app.email}</TableCell>
              <TableCell className="max-w-xs truncate">{app.educationalBackground}</TableCell>
              <TableCell>{app.submittedAt ? dateFmt.format(new Date(app.submittedAt)) : "—"}</TableCell>
              <TableCell>
                <StatusBadge status={(app.applicationStatus as AppStatus) ?? "pending"} />
              </TableCell>

              {/* View details */}
 <Button
  variant="ghost"
  size="sm"
  onClick={async (e) => {
    e.stopPropagation();
    setSelected(app);
    setDetailsOpen(true);

    // ✅ Fetch email only if not already loaded
    if (!emailMap[app.applicationId]) {
      try {
        const email = await getCuratorEmailByApplicationId(app.applicationId);
        setEmailMap((prev) => ({ ...prev, [app.applicationId]: email }));
      } catch (e) {
        console.warn("Failed to fetch email", e);
      }
    }
  }}
>
  <Eye className="h-4 w-4 mr-1" />
  View Details
</Button>


              {/* Kebab actions (pending only) */}
              <TableCell>
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setDetailsOpen(false);
                          setSelected(app);
                          setShowApproveDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDetailsOpen(false);
                          setSelected(app);
                          setRejectionReason("");
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Curator Applications</h1>
          <p className="text-muted-foreground">Review and manage upgrade to curator requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
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

      {/* Search */}
      <div className="w-full md:w-96 relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name, email, education…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("pending")}
        >
          Pending ({counts.pending})
        </Button>
        <Button
          variant={activeTab === "accepted" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("accepted")}
        >
          Accepted ({counts.accepted})
        </Button>
        <Button
          variant={activeTab === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("rejected")}
        >
          Rejected ({counts.rejected})
        </Button>
      </div>

      {/* Table + pagination */}
      <Card className="overflow-x-auto">
        <AppsTable status={activeTab} />
        <div className="px-6 pb-4">
          <Pagination status={activeTab} />
        </div>
      </Card>

      {/* Details Dialog */}
      {selected && (
        <Dialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details — {selected.fname}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Full Name</h4>
                  <p className="text-muted-foreground">{selected.fname}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                 <p className="text-muted-foreground">
  {emailMap[selected.applicationId] ?? selected.email ?? "—"}
</p>

                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Educational Background</h4>
                <p className="text-muted-foreground">{selected.educationalBackground}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Professional Experience</h4>
                <p className="text-muted-foreground">{selected.personalExperience}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Motivation</h4>
                <p className="text-muted-foreground">{selected.motivationReason}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Portfolio</h4>
                <a
                  href={selected.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {selected.portfolioLink}
                </a>
              </div>

              {selected.certificationPath && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">CV Document:</p>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {selected.certificationPath.split("/").pop()}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selected.certificationPath, "_blank")}
                        className="h-8"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = selected.certificationPath!;
                          a.download = selected.certificationPath!.split("/").pop() ?? "cv.pdf";
                          a.click();
                        }}
                        className="h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-1">Submitted Date</h4>
                <p className="text-muted-foreground">
                  {selected.submittedAt ? dateFmt.format(new Date(selected.submittedAt)) : "—"}
                </p>
              </div>

              {(selected.applicationStatus as AppStatus) === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setDetailsOpen(false);
                      setShowApproveDialog(true);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDetailsOpen(false);
                      setRejectionReason("");
                      setShowRejectDialog(true);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p>
                Approve curator application for <strong>{selected.fname}</strong> ({selected.email})?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selected.applicationId)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Confirm Approve
                </Button>
                <Button variant="ghost" onClick={() => setShowApproveDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Provide a reason for rejecting this application.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full p-2 border rounded-md"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selected && handleReject(selected.applicationId, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
