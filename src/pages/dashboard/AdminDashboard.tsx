// src/pages/admin/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  countAnnouncementsAdmin,
  fetchDashboardStats,
  fetchRecentActivities,
  type AdminDashboardStats,
  type AdminRecentActivity,
  type PageResponse,
} from "@/services/api";

import {
  ArrowRight,
  BarChart3,
  Image as ImageIcon,
  Megaphone,
  Users,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  // recent activity (server-paged)
  const [activitiesData, setActivitiesData] =
    useState<PageResponse<AdminRecentActivity> | null>(null);
  const [activitiesPage, setActivitiesPage] = useState(1); // 1-based for UI
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [announcementCount, setAnnouncementCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); // top-level loading (stats + first activities page)
  const [error, setError] = useState<string | null>(null);

  const pageSize = 5;

  // auth gate
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "admin") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);

  // initial load: stats + first activities page + announcement count
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [s, a, c] = await Promise.all([
          fetchDashboardStats({ signal: controller.signal }),
          fetchRecentActivities({
            signal: controller.signal,
            page: 0, // server 0-based
            size: pageSize,
          }),
          countAnnouncementsAdmin({ signal: controller.signal }),
        ]);

        setStats(s);
        setActivitiesData(a);
        setAnnouncementCount(c);
      } catch (e: any) {
        if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
          setError("Failed to load admin dashboard data");
          // optional: console.error(e);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch activities when page changes (server-side pagination)
  useEffect(() => {
    // skip fetch on first render because initial effect already loaded page 1 (0-based)
    if (activitiesPage === 1) return;

    const controller = new AbortController();
    (async () => {
      try {
        setActivitiesLoading(true);
        setError(null);

        const a = await fetchRecentActivities({
          signal: controller.signal,
          page: activitiesPage - 1, // convert to 0-based
          size: pageSize,
        });

        setActivitiesData(a);
      } catch (e: any) {
        if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
          setError("Failed to load activities");
          // optional: console.error(e);
        }
      } finally {
        setActivitiesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activitiesPage]);

  const dashboardItems = useMemo(
    () => [
      {
        title: "Manage Users",
        description: "View, edit, and manage user accounts",
        icon: Users,
        path: "/admin/users",
        count: stats?.totalUsers ?? "—",
        color: "text-blue-600",
      },
      {
        title: "Manage Artworks",
        description: "Browse, view, and delete artworks",
        icon: ImageIcon,
        path: "/admin/artworks",
        count: stats?.totalArtworks ?? "—",
        color: "text-green-600",
      },
      {
        title: "Manage Announcements",
        description: "Create, edit, and manage announcements",
        icon: Megaphone,
        path: "/admin/announcements",
        count: announcementCount ?? "—",
        color: "text-purple-600",
      },
    ],
    [stats, announcementCount]
  );

  // pagination controls (server data)
  const totalPages = Math.max(1, activitiesData?.totalPages ?? 1);
  const totalItems = activitiesData?.totalElements ?? 0;
  const canPrev = activitiesPage > 1;
  const canNext = activitiesPage < totalPages;

  // nicer timestamp formatting
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Manage your Historical Archive Gallery system
          </p>
        </div>

        {/* Stats Overview */}
        {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboardItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="hover:shadow-lg transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {loading ? "…" : item.count}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {item.description}
                  </p>
                  <Link to={item.path}>
                    <Button variant="outline" size="sm" className="w-full group">
                      Manage
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions and updates in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(loading || activitiesLoading) && !(activitiesData?.content?.length ?? 0) && (
                <div className="text-sm text-muted-foreground">Loading recent activity…</div>
              )}

              {!loading && !activitiesLoading && !(activitiesData?.content?.length ?? 0) && (
                <div className="text-sm text-muted-foreground">No recent activity.</div>
              )}

              {activitiesData?.content?.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-4 bg-surface/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{act.action}</p>
                    <p className="text-sm text-muted-foreground">{act.details}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {act.timestamp ? dateFmt.format(new Date(act.timestamp)) : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Prev / Next pagination (server-side) */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-medium">{activitiesPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                  {typeof totalItems === "number" ? (
                    <> — total {totalItems} items</>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canPrev || activitiesLoading}
                    onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canNext || activitiesLoading}
                    onClick={() => setActivitiesPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
