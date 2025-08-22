import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useNavigate } from "react-router-dom";
/**
 * Admin Dashboard
 * - Single data loader using AbortController (avoids isMounted flag)
 * - Stronger types for stats/activities
 * - Gentle loading UX & error note
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();
  
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activitiesData, setActivitiesData] =
    useState<PageResponse<AdminRecentActivity> | null>(null);
  const [announcementCount, setAnnouncementCount] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesPage, setActivitiesPage] = useState(1); // 1-based for UI
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const pageSize = 5;


   useEffect(() => {
    if (!ready) return;

    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "admin") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);
  // Load initial stats and activities
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
            page: 0,
            size: pageSize,
          }),
          countAnnouncementsAdmin({ signal: controller.signal }),
        ]);

        setStats(s);
        setActivitiesData(a);
        setAnnouncementCount(c);
      } catch (e: any) {
        if (e?.name === "CanceledError" || e?.name === "AbortError") return;
        setError("Failed to load admin dashboard data");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Load activities when page changes
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setActivitiesLoading(true);
        const a = await fetchRecentActivities({
          signal: controller.signal,
          page: activitiesPage - 1, // Convert to 0-based
          size: pageSize,
        });
        setActivitiesData(a);
      } catch (e: any) {
        if (e?.name === "CanceledError" || e?.name === "AbortError") return;
        setError("Failed to load activities");
      } finally {
        setActivitiesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activitiesPage]);

  // You can inline this array; useMemo is optional here (cheap compute).
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your Historical Archive Gallery system
          </p>
        </div>

        {/* Stats Overview */}
        {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full group"
                    >
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
            <CardDescription>
              Latest actions and updates in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(loading || activitiesLoading) &&
                !activitiesData?.content?.length && (
                  <div className="text-sm text-muted-foreground">
                    Loading recent activity…
                  </div>
                )}
              {!loading &&
                !activitiesLoading &&
                !activitiesData?.content?.length && (
                  <div className="text-sm text-muted-foreground">
                    No recent activity.
                  </div>
                )}
              {activitiesData?.content?.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-4 bg-surface/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{act.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {act.details}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {act.timestamp
                      ? new Date(act.timestamp).toLocaleString()
                      : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination for Recent Activity */}
            {activitiesData && activitiesData.totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (activitiesPage > 1)
                            setActivitiesPage(activitiesPage - 1);
                        }}
                        className={
                          activitiesPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                    {Array.from(
                      { length: activitiesData.totalPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setActivitiesPage(page);
                          }}
                          isActive={activitiesPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (activitiesPage < activitiesData.totalPages)
                            setActivitiesPage(activitiesPage + 1);
                        }}
                        className={
                          activitiesPage === activitiesData.totalPages
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
    </div>
  );
}
