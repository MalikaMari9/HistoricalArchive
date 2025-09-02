import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  adminListUsers,
  adminRestrictUser,
  adminUnrestrictUser,
  adminUpdateUserRole,
  type AdminUser,
} from "@/services/api";

import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  MoreHorizontal,
  Search,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

/** Local “status” type for filtering */
type StatusFilter = "all" | "pending" | "accepted" | "rejected";

export default function ManageUsers() {
  const { user, ready } = useAuthGuard();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side pagination (unchanged)
  const [pageIndex, setPageIndex] = useState(1); // 1-based index
  const pageSize = 6;

  // Create User modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminUser["role"]>("visitor");
  const [creating, setCreating] = useState(false);

  // NEW: status filter state (like professor page, but single table)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ───────────────────────── Auth Guard ─────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "admin") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);

  // ───────────────────────── Data Load ─────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminListUsers();
      setUsers(data);
    } catch (e) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  // ───────────────────── Status Helpers (derived) ─────────────────────
  /**
   * Determine a user's status (pending/accepted/rejected) from available fields.
   * Priority:
   * 1) user.status or user.applicationStatus if provided by API
   * 2) derived from `restricted`: accepted = !restricted, rejected = restricted
   * 3) pending only if API provides it
   */
  function getUserStatus(u: AdminUser): "pending" | "accepted" | "rejected" {
    const anyU = u as any;
    const explicit = (anyU.status ||
      anyU.applicationStatus ||
      anyU.approvalStatus) as StatusFilter | undefined;

    if (explicit === "pending" || explicit === "accepted" || explicit === "rejected") {
      return explicit;
    }

    // Fallback to restricted mapping
    return u.restricted ? "rejected" : "accepted";
  }

  // Counts for status pills
  const statusCounts = useMemo(() => {
    let pending = 0,
      accepted = 0,
      rejected = 0;
    for (const u of users) {
      const s = getUserStatus(u);
      if (s === "pending") pending++;
      else if (s === "accepted") accepted++;
      else rejected++;
    }
    return { pending, accepted, rejected, total: users.length };
  }, [users]);

  // ───────────────────────── Filters + Search ─────────────────────────
  // When search or status changes, go back to first page for UX
  useEffect(() => {
    setPageIndex(1);
  }, [searchQuery, statusFilter]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users
      // hide admins from the table
      .filter((u) => u.role !== "admin")
      // status filter
      .filter((u) => {
        const s = getUserStatus(u);
        if (statusFilter === "all") return true;
        return s === statusFilter;
      })
      // search filter (username, email, role, and status text)
      .filter((u) => {
        if (!q) return true;
        const s = getUserStatus(u);
        return (
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          s.includes(q) // allow searching by "pending/accepted/rejected"
        );
      });
  }, [users, searchQuery, statusFilter]);

  // ───────────────────────── Pagination ─────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, pageIndex]);

  // ───────────────────────── UI helpers ─────────────────────────
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "professor":
        return "default";
      case "curator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleChangeRole = async (u: AdminUser) => {
    const next = window.prompt(
      "Set role (admin, professor, curator, visitor):",
      u.role
    );
    if (!next) return;
    try {
      await adminUpdateUserRole(u.userId, next as AdminUser["role"]);
      await load();
    } catch {
      alert("Failed to update role");
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (
      !window.confirm(
        `Restrict user ${u.username}? They won't be able to login.`
      )
    )
      return;
    try {
      await adminRestrictUser(u.userId);
      await load();
    } catch {
      alert("Failed to restrict user");
    }
  };

  const handleUnrestrict = async (u: AdminUser) => {
    try {
      await adminUnrestrictUser(u.userId);
      await load();
    } catch {
      alert("Failed to unrestrict user");
    }
  };

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    []
  );

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
          <div>
            <h1 className="text-4xl font-bold text-primary">Manage Users</h1>
            <p className="text-muted-foreground text-lg">
              View and manage all user accounts in the system
            </p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Search + Status filter */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, role, or status…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status "tabs" (filter pills) – single table remains */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({statusCounts.total})
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Pending ({statusCounts.pending})
                </Button>
                <Button
                  variant={statusFilter === "accepted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("accepted")}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accepted ({statusCounts.accepted})
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("rejected")}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejected ({statusCounts.rejected})
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="text-sm text-muted-foreground">
                          Loading users…
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="text-sm text-destructive">{error}</div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    !error &&
                    paginatedUsers.map((u) => {
                      const status = getUserStatus(u);
                      return (
                        <TableRow key={u.userId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{u.username}</div>
                              <div className="text-sm text-muted-foreground">
                                {u.email}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge>
                          </TableCell>

                          <TableCell>
                            {status === "pending" ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Pending
                              </Badge>
                            ) : status === "accepted" ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Accepted
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Rejected
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                          </TableCell>

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleChangeRole(u)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>

                                {!u.restricted ? (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDelete(u)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Restrict User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleUnrestrict(u)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Unrestrict User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && !loading && !error && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No users found matching your search or status filter.
                </p>
              </div>
            )}

            {/* Pagination (unchanged) */}
            {filteredUsers.length > 0 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pageIndex > 1) setPageIndex(pageIndex - 1);
                        }}
                        className={pageIndex === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPageIndex(p);
                          }}
                          isActive={pageIndex === p}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pageIndex < totalPages) setPageIndex(pageIndex + 1);
                        }}
                        className={
                          pageIndex === totalPages ? "pointer-events-none opacity-50" : ""
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

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Role</label>
              <select
                className="w-full border rounded h-10 px-3 bg-background"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminUser["role"])}
              >
                <option value="visitor">visitor</option>
                <option value="curator">curator</option>
                <option value="professor">professor</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newUsername || !newEmail || !newPassword) return;
                try {
                  setCreating(true);
                  const res = await fetch("http://localhost:8080/api/users/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      username: newUsername,
                      email: newEmail,
                      password: newPassword,
                    }),
                  });
                  if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(msg || "Failed to create user");
                  }
                  const fresh = await adminListUsers();
                  setUsers(fresh);
                  if (newRole && newRole !== "visitor") {
                    const created = fresh.find(
                      (u) => u.email.toLowerCase() === newEmail.toLowerCase()
                    );
                    if (created) {
                      await adminUpdateUserRole(created.userId, newRole);
                      const refreshed = await adminListUsers();
                      setUsers(refreshed);
                    }
                  }
                  setIsCreateOpen(false);
                  setNewUsername("");
                  setNewEmail("");
                  setNewPassword("");
                  setNewRole("visitor");
                } catch (e) {
                  alert(String(e));
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating || !newUsername || !newEmail || !newPassword}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
