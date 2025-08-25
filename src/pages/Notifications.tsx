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
  markNotificationRead,
  type ViewUserProfile,
  type NotificationDto,
} from "@/services/api";

/* --------------------------------- Types ---------------------------------- */

type UserRole = "visitor" | "curator" | "professor" | "admin";

/* -------------------------------- Helpers --------------------------------- */

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

function buildVisitLink(n: NotificationDto, userRole: UserRole): string | null {
  if (
    n.notificationType === "CURATOR_APPLICATION_APPROVED" ||
    n.notificationType === "CURATOR_APPLICATION_REJECTED"
  ) return null;

  if (userRole === "professor") {
    if (n.relatedType === "curator_application" && n.relatedId)
      return `/professor/curators/review/${n.relatedId}`;

    if (n.relatedType === "artifact") {
      if (n.notificationType === "ARTIFACT_UPLOADED" && n.relatedId)
        return `/professor/review-artifacts?status=pending&focusSubmissionId=${encodeURIComponent(n.relatedId)}`;
      if (n.relatedId) return `/artwork/${n.relatedId}`;
    }
  }

  if (
    n.relatedType === "artifact" &&
    (n.notificationType === "ARTIFACT_ACCEPTED" || n.notificationType === "ARTIFACT_REJECTED") &&
    n.relatedId
  ) return `/artwork/${n.relatedId}`;

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

  function markAsReadLocally(id: number) {
    setItems((prev) =>
      [...prev.map((item) =>
        item.notiId === id ? { ...item, isRead: true } : item
      )]
    );
  }

  useEffect(() => {
    if (!ready || !user) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const me: ViewUserProfile = await getMyPublicProfile({ signal: ac.signal });
        setRole(me.role);

        const list = await listNotifications({ signal: ac.signal, unreadOnly: false });
console.log("Fetched notifications:");
list.forEach((n) => {
  console.log(`ID: ${n.notiId}, isRead: ${n.isRead}`);
});

        setItems(list ?? []);
        const sorted = (list ?? []).sort((a, b) => {
  if (a.isRead === b.isRead) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // latest first
  }
  return a.isRead ? 1 : -1; // unread first
});
setItems(sorted);

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
  }, [ready, user]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const prev = [...items];
    setItems(prev.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllNotificationsRead();
    } catch (e) {
      console.error(e);
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
       <style>
    {`
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: rgba(107, 114, 128, 0.4); /* like Tailwind gray-500 */
        border-radius: 9999px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background-color: transparent;
      }

      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none; /* IE */
        scrollbar-width: none;    /* Firefox */
      }
    `}
  </style>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Notifications ({items.length})</h1>
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

     <div className="bg-card rounded-lg border shadow-sm max-h-[500px] overflow-y-auto scrollbar-thin">



        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Action</TableHead>
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
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            await markNotificationRead(n.notiId);
                            markAsReadLocally(n.notiId);
                          } catch (err) {
                            console.error("Failed to mark as read:", err);
                          } finally {
                            navigate(visitLink);
                          }
                        }}
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

                  <TableCell>
                    {!n.isRead && (
<Button
  variant="default"
  size="sm"
  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
  onClick={async () => {
    try {
      await markNotificationRead(n.notiId);
      markAsReadLocally(n.notiId);
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  }}
>
  Mark Read
</Button>

                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No notifications found</p>
        </div>
      )}
    </div>
  );
};
