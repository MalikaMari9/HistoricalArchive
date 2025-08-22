import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Eye, MessageSquare, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  professorListPendingArtworks,
  professorListRecentDecisions,
  professorGetStats,
  professorListPendingCurators,
  professorListPendingArtifacts,
  ProfessorPendingArtwork,
  ProfessorRecentDecision,
  ProfessorStats,
  ProfessorPendingCurator,
  ProfessorPendingArtifact,
} from "@/services/api";
import axios, { AxiosError } from "axios";

type PendingArtworkVM = {
  id: number;
  title: string;
  curator: string;
  category: string;
  submittedDate: string; // formatted
  priority: "high" | "medium" | "low";
};

type RecentDecisionVM = {
  artwork: string;
  decision: "approved" | "rejected";
  curator: string;
  date: string; // "x minutes ago"
};

type PendingCuratorVM = ProfessorPendingCurator & {
  dob: string;         // formatted
  submittedAt: string; // formatted
};

type PendingArtifactVM = {
  id: string;
  title: string;
  category: string;
  uploaded_by: string;
  uploaded_at: string; // formatted
};

export default function ProfessorDashboard() {
  const navigate = useNavigate();
const { user, ready } = useAuthGuard();
  const [pendingArtworks, setPendingArtworks] = useState<PendingArtworkVM[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecisionVM[]>([]);
  const [stats, setStats] = useState<ProfessorStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [pendingCurators, setPendingCurators] = useState<PendingCuratorVM[]>([]);
  const [pendingArtifacts, setPendingArtifacts] = useState<PendingArtifactVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }),
    []
  );

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


  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [artworks, decisions, dashStats, curators, artifacts] = await Promise.all([
          professorListPendingArtworks(),
          professorListRecentDecisions(),
          professorGetStats(),
          professorListPendingCurators(),
          professorListPendingArtifacts(),
        ]);

        setPendingCurators(
          curators.map((c) => ({
            ...c,
            dob: c.dob ? dateFmt.format(new Date(c.dob)) : "",
            submittedAt: c.submittedAt ? dateFmt.format(new Date(c.submittedAt)) : "",
          }))
        );

        setPendingArtifacts(
          artifacts.map<PendingArtifactVM>((a: ProfessorPendingArtifact) => ({
            id: a.id,
            title: a.title,
            category: a.category,
            uploaded_by: a.curatorUsername,
            uploaded_at: a.uploaded_at ? dateFmt.format(new Date(a.uploaded_at)) : "",
          }))
        );

        setPendingArtworks(
          artworks.map<PendingArtworkVM>((a: ProfessorPendingArtwork) => ({
            id: a.id,
            title: a.title,
            curator: a.curator,
            category: a.category,
            submittedDate: a.submittedDate ? dateFmt.format(new Date(a.submittedDate)) : "",
            priority:
              (a.priority?.toLowerCase() as PendingArtworkVM["priority"]) ?? "low",
          }))
        );

        setRecentDecisions(
          decisions.map<RecentDecisionVM>((d: ProfessorRecentDecision) => ({
            artwork: d.artworkTitle,
            decision: (d.decision?.toString().toLowerCase() as RecentDecisionVM["decision"]) || "approved",
            curator: d.curator,
            date: timeAgo(d.decisionDate),
          }))
        );

        setStats(dashStats);
      } catch (e) {
        // If your interceptor auto-redirects on 401/403, ignore here.
        const ax = e as AxiosError;
        if (axios.isAxiosError(ax) && ax.response && (ax.response.status === 401 || ax.response.status === 403)) {
          navigate("/signin", { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [ready, dateFmt, navigate]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-destructive bg-card/80 max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Professor Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Review and approve curator submissions for the Historical Archive Gallery
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviewed</CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Curators */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Curator Applications
            </CardTitle>
            <CardDescription>Curators awaiting your review – view full details in the dedicated page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 px-4">Name</th>
                    <th className="py-2 px-4">Email</th>
                    <th className="py-2 px-4">DOB</th>
                    <th className="py-2 px-4">Submitted</th>
                    <th className="py-2 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCurators.map((c) => (
                    <tr key={c.applicationId} className="border-b border-border/20 hover:bg-surface/40 transition">
                      <td className="py-2 px-4">
                        {c.fname} ({c.username})
                      </td>
                      <td className="py-2 px-4">{c.email}</td>
                      <td className="py-2 px-4">{c.dob}</td>
                      <td className="py-2 px-4">{c.submittedAt}</td>
                      <td className="py-2 px-4">
                        <Link
                          to={`/professor/curator-applications/${c.applicationId}`}
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <Link to="/professor/curator-applications">
                <Button variant="outline">View All Applications</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pending Artifacts + Recent Decisions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Artifacts
              </CardTitle>
              <CardDescription>Artifacts submitted by curators that require your review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 px-4">Title</th>
                      <th className="py-2 px-4">Category</th>
                      <th className="py-2 px-4">Uploaded by</th>
                      <th className="py-2 px-4">Submitted</th>
                      <th className="py-2 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingArtifacts.map((a) => (
                      <tr key={a.id} className="border-b border-border/20 hover:bg-surface/40 transition">
                        <td className="py-2 px-4">{a.title}</td>
                        <td className="py-2 px-4">{a.category}</td>
                        <td className="py-2 px-4">{a.uploaded_by}</td>
                        <td className="py-2 px-4">{a.uploaded_at}</td>
                        <td className="py-2 px-4">
                          <Link
                            to={`/professor/review/artifact/${a.id}`}
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <Link to="/professor/review">
                  <Button variant="outline">View All Artifacts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Recent Decisions
              </CardTitle>
              <CardDescription>Your latest review decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDecisions.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{d.artwork}</p>
                      <p className="text-xs text-muted-foreground">by {d.curator}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={d.decision === "approved" ? "default" : "destructive"}>
                        {d.decision}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{d.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */
function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}
