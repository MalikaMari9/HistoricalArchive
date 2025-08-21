import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchAdminReportsOverview,
  fetchRecentActivities,
  fetchTopArtworks,
} from "@/services/api";
import {
  ArrowLeft,
  Download,
  Eye,
  Image,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Reports() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtworks: 0,
    totalViews: 0, // not tracked yet
    newUsersThisMonth: 0,
    artworksAddedThisMonth: 0, // not tracked yet
    topCategory: "-", // not tracked yet
  });

  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: number; action: string; details: string; timestamp: string }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topArtworks, setTopArtworks] = useState<
    Array<{
      title: string;
      curator: string;
      views: number;
      rating: number;
    }>
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [overview, activity, top] = await Promise.all([
          fetchAdminReportsOverview(),
          fetchRecentActivities(),
          fetchTopArtworks(),
        ]);
        setStats((s) => ({
          ...s,
          totalUsers: overview.totalUsers,
          totalArtworks: overview.totalArtworks,
          newUsersThisMonth: overview.newUsersThisMonth,
        }));
        setRecentActivity(
          activity.map((a: any) => ({
            id: a.id,
            action: a.action,
            details: a.details,
            timestamp: a.timestamp,
          }))
        );
        setTopArtworks(top);
      } catch (e) {
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-primary">Reports</h1>
            <p className="text-muted-foreground text-lg">
              Analytics and insights for your Historical Archive Gallery
            </p>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersThisMonth} this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Artworks
              </CardTitle>
              <Image className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArtworks}</div>
              <p className="text-xs text-muted-foreground">
                {/* backlog: artworks added this month */}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+15.3%</div>
              <p className="text-xs text-muted-foreground">Monthly growth</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Category
              </CardTitle>
              <Image className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{stats.topCategory}</div>
              <p className="text-xs text-muted-foreground">Most popular</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.6</div>
              <p className="text-xs text-muted-foreground">Out of 5 stars</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest actions and events in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading && (
                  <div className="text-sm text-muted-foreground p-3">
                    Loading…
                  </div>
                )}
                {error && !loading && (
                  <div className="text-sm text-destructive p-3">{error}</div>
                )}
                {!loading &&
                  !error &&
                  recentActivity.map((activity, index) => (
                    <div
                      key={activity.id ?? index}
                      className="flex justify-between items-start p-3 bg-surface/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.details}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Artworks */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top Performing Artworks</CardTitle>
              <CardDescription>
                Most viewed and highest rated artworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArtworks.map((artwork, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-surface/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{artwork.title}</p>
                      <p className="text-sm text-muted-foreground">
                        by {artwork.curator}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {artwork.views} views
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ★ {artwork.rating}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Download detailed reports in various formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Download className="h-6 w-6" />
                User Report (CSV)
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Download className="h-6 w-6" />
                Artwork Report (PDF)
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Download className="h-6 w-6" />
                Analytics Report (Excel)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
