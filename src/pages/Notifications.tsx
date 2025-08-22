import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  getMyPublicProfile,
  listNotifications,
  markAllNotificationsRead,
  type ViewUserProfile,
  type NotificationDto,
} from "@/services/api";

/* --------------------------------- Types ---------------------------------- */

type UserRole = "visitor" | "curator" | "professor" | "admin";

/* -------------------------------- Helpers --------------------------------- */

/** “2h ago” style relative time (simple, fast) */
function formatRelative(isoDate: string) {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Decide where a notification should link to (if anywhere),
 * based on its type, related object, and the current user's role.
 */
function buildVisitLink(n: NotificationDto, userRole: UserRole): string | null {
  // Info-only curator application outcomes
  if (
    n.notificationType === "CURATOR_APPLICATION_APPROVED" ||
    n.notificationType === "CURATOR_APPLICATION_REJECTED"
  ) {
    return null;
  }

  // Professor navigations
  if (userRole === "professor") {
    if (n.relatedType === "curator_application" && n.relatedId) {
      return `/professor/curators/review/${n.relatedId}`;
    }
    if (n.relatedType === "artifact") {
      if (n.notificationType === "ARTIFACT_UPLOADED" && n.relatedId) {
        // deep-link to review screen; your route may differ
        return `/professor/review-artifacts?status=pending&focusSubmissionId=${encodeURIComponent(
          n.relatedId
        )}`;
      }
      if (n.relatedId) {
        // public artifact page by Mongo artifact id
        return `/artwork/${n.relatedId}`;
      }
    }
  }

  // Uploader navigations (accepted/rejected)
  if (
    n.relatedType === "artifact" &&
    (n.notificationType === "ARTIFACT_ACCEPTED" || n.notificationType === "ARTIFACT_REJECTED") &&
    n.relatedId
  ) {
    return `/artwork/${n.relatedId}`;
  }

  return null;
}

/* -------------------------------- Component ------------------------------- */

export const Notifications = () => {
  const navigate = useNavigate();
 const { user, ready } = useAuthGuard();
  const [role, setRole] = useState<UserRole>("visitor");
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  // Load role + notifications
  useEffect(() => {
     if (!ready) return;               // wait until auth resolved
    if (!user) return;                // useAuthGuard already redirected

    // Use role from context (no extra API call)
    setRole(user.role as UserRole);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user role first (for link decisions)
        const me: ViewUserProfile = await getMyPublicProfile({ signal: ac.signal });
        setRole(me.role);

        // Fetch notifications
        const list = await listNotifications({ signal: ac.signal });
        setItems(list ?? []);
      } catch (err: any) {
        if (err?.name === "CanceledError") return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          window.location.href = "/login";
          return;
        }
        setError(err?.message || "Failed to load notifications");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  // Mark all as read (optimistic)
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const prev = items;
    setItems((p) => p.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllNotificationsRead();
    } catch (e) {
      console.error(e);
      // soft rollback (optional)
      setItems(prev);
    }
  };

  /* ------------------------------ Render states ---------------------------- */

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        </div>
        <div className="mt-6 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        </div>
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Notifications ({items.length})
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <>
              <Badge variant="default" className="text-sm">
                {unreadCount} Unread
              </Badge>
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Read All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>From</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((n) => {
              const visitLink = buildVisitLink(n, role);
              const time = formatRelative(n.createdAt);
              const from = n.source?.username ?? "System";

              return (
                <TableRow key={n.notiId} className={n.isRead ? "opacity-60" : "bg-muted/30"}>
                  <TableCell>
                    <Badge variant={n.isRead ? "secondary" : "default"}>
                      {n.isRead ? "Read" : "Unread"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-sm">{time}</TableCell>

                  <TableCell className="max-w-md">
                    {visitLink ? (
                      <Link
                        to={visitLink}
                        className={`hover:underline transition-colors ${
                          n.isRead
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-foreground font-medium hover:text-primary"
                        }`}
                      >
                        {n.message}
                      </Link>
                    ) : (
                      <span className={n.isRead ? "text-muted-foreground" : "text-foreground font-medium"}>
                        {n.message}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground">{from}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No notifications found</p>
        </div>
      )}
    </div>
  );
};
