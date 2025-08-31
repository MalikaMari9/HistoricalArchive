// ==========================
// file: src/pages/professor/ProfessorAudit.tsx
// ==========================
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { professorRecentDecisions, type ReviewDecisionDto } from "@/services/api";

const PAGE_SIZE = 10;

type TypeFilter = "all" | "artifact" | "curator";
type StatusFilter = "all" | "accepted" | "rejected";

export default function ProfessorAudit() {
  const navigate = useNavigate();
  const { ready, user } = useAuthGuard();

  // server paging state
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ReviewDecisionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // server-side filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce search text
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // reset to first page whenever filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter, statusFilter]);

  // abort control
  const aborter = useRef<AbortController | null>(null);

  // auth gate
  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/signin", { replace: true });
    else if (user.role !== "professor") navigate("/403", { replace: true });
  }, [ready, user, navigate]);

  // fetch page with server-side filters
  useEffect(() => {
    if (!ready) return;
    aborter.current?.abort();
    const ac = new AbortController();
    aborter.current = ac;
    setLoading(true);
    setError(null);

    professorRecentDecisions(page, PAGE_SIZE, {
      signal: ac.signal,
      q: debouncedSearch || undefined,
      type: typeFilter,
      status: statusFilter,
    })
      .then((res) => {
        setItems(res.items || []);
        setTotal(Number(res.total) || 0);
      })
      .catch((e: any) => {
        if (e?.name === "AbortError" || e?.name === "CanceledError") return;
        setError(e?.message || "Failed to load recent decisions");
      })
      .finally(() => setLoading(false));
  }, [ready, page, debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  function DecisionPill({ decision }: { decision: "approved" | "rejected" }) {
    if (decision === "approved") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Rejected
      </Badge>
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
          <h1 className="text-3xl font-bold text-foreground">Recent Decisions</h1>
          <p className="text-muted-foreground">
            A unified audit of your most recent approvals and rejections
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            className="pl-9"
            placeholder="Search by title or curator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="artifact">Artifacts</option>
            <option value="curator">Curators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All decisions</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title / Name</TableHead>
                <TableHead>Curator</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Reviewed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading recent decisions…</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No decisions found.</TableCell>
                </TableRow>
              ) : (
                items.map((d, idx) => (
                  <TableRow key={`${d.type}-${d.title}-${d.date}-${idx}`}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {d.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[420px]">{d.title}</TableCell>
                    <TableCell className="truncate max-w-[260px]">{d.curator}</TableCell>
                    <TableCell>
                      <DecisionPill decision={d.decision} />
                    </TableCell>
                    <TableCell>{d.date ? dateFmt.format(new Date(d.date)) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing page <span className="font-medium">{page + 1}</span> of{" "}
              <span className="font-medium">{totalPages}</span> — total {total} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
