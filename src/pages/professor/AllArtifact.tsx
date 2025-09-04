// src/pages/professor/AllArtifacts.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  professorListAllArtifacts,
  type ProfessorAllArtifactItem,
  type PageResponse,
} from "@/services/api";

import {
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
} from "lucide-react";

type Status = "pending" | "accepted" | "rejected";

function getStatusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  }
  if (s === "accepted") {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" /> Accepted
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" /> Rejected
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function ProfessorAllArtifacts() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();

  // tabs, search, pagination
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(0);
  const size = 10;

  // data + ui
  const [rows, setRows] = useState<ProfessorAllArtifactItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // per-tab totals across ALL artifacts (for current search)
  const [tabTotals, setTabTotals] = useState<{ pending: number; accepted: number; rejected: number }>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // auth guard + initial load
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (user.role !== "professor") {
      navigate("/403", { replace: true });
      return;
    }

    // first counts + first tab page
    void (async () => {
      await loadCounts("");
      await loadPage(0, "", "pending");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  // refresh when search changes
  useEffect(() => {
    if (!ready || !user) return;
    setPage(0);
    void (async () => {
      await loadCounts(debouncedSearch);
      await loadPage(0, debouncedSearch, activeTab);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // switch tab -> reset page and load that tab
  useEffect(() => {
    if (!ready || !user) return;
    setPage(0);
    void loadPage(0, debouncedSearch, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadCounts(q: string) {
    try {
      const [p, a, r] = await Promise.all([
        professorListAllArtifacts(0, 1, q, "pending"),
        professorListAllArtifacts(0, 1, q, "accepted"),
        professorListAllArtifacts(0, 1, q, "rejected"),
      ]);
      setTabTotals({
        pending: p.total || 0,
        accepted: a.total || 0,
        rejected: r.total || 0,
      });
    } catch (e) {
      console.error("Failed to load tab totals:", e);
    }
  }

  async function loadPage(p: number, q: string, status: Status) {
    setLoading(true);
    setErr(null);
    try {
      const resp: PageResponse<ProfessorAllArtifactItem> = await professorListAllArtifacts(p, size, q, status);
      setRows(resp.items || []);
      setTotal(resp.total || 0); // total across ALL artifacts matching q+status
      setPage(resp.page ?? p);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to load artifacts");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / size));
  const goPrev = () => page > 0 && loadPage(page - 1, debouncedSearch, activeTab);
  const goNext = () => page + 1 < totalPages && loadPage(page + 1, debouncedSearch, activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate("/professor")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">All Artifacts</h1>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Every submission (view-only unless assigned)</CardTitle>

              {/* Search bar */}
              <div className="w-full max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search title or curator…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {err && (
              <div className="mb-4 text-sm text-red-600 border border-red-300 rounded p-3">
                {err}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="pending">Pending ({tabTotals.pending})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({tabTotals.accepted})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({tabTotals.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <ArtifactTable
                  rows={rows}
                  loading={loading}
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  goPrev={goPrev}
                  goNext={goNext}
                />
              </TabsContent>

              <TabsContent value="accepted">
                <ArtifactTable
                  rows={rows}
                  loading={loading}
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  goPrev={goPrev}
                  goNext={goNext}
                />
              </TabsContent>

              <TabsContent value="rejected">
                <ArtifactTable
                  rows={rows}
                  loading={loading}
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  goPrev={goPrev}
                  goNext={goNext}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ sub components ------------------------------ */

function ArtifactTable({
  rows,
  loading,
  page,
  totalPages,
  total,
  goPrev,
  goNext,
}: {
  rows: ProfessorAllArtifactItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  goPrev: () => void;
  goNext: () => void;
}) {
  const navigate = useNavigate();

  if (loading && rows.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!loading && rows.length === 0) {
    return (
      <>
        <div className="p-6 text-sm text-muted-foreground">No artifacts found.</div>
        <Pager page={page} totalPages={totalPages} total={total} goPrev={goPrev} goNext={goNext} />
      </>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Curator</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
           
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const assignedTo = row.assignedProfessorName ?? "Unassigned";
            const canReview = !!row.canReview;

            return (
              <TableRow key={`${row.artifactId}-${row.curatorId}`}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell>{row.curatorName}</TableCell>
                <TableCell>{formatDate(row.submissionDate)}</TableCell>
                <TableCell>{getStatusBadge(row.status)}</TableCell>
                <TableCell>
                  {row.assignedProfessorName ? (
                    <Badge variant="outline">{assignedTo}</Badge>
                  ) : (
                    <Badge variant="secondary">Unassigned</Badge>
                  )}
                </TableCell>
           
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Pager page={page} totalPages={totalPages} total={total} goPrev={goPrev} goNext={goNext} />
    </>
  );
}

function Pager({
  page,
  totalPages,
  total,
  goPrev,
  goNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  goPrev: () => void;
  goNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Page <span className="font-medium">{page + 1}</span> of{" "}
        <span className="font-medium">{totalPages}</span> — total {total} items
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={page === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <Button variant="outline" size="sm" onClick={goNext} disabled={page + 1 >= totalPages}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
