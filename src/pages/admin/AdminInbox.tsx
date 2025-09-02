import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import {
  adminListContactMessages,
  adminSoftDeleteContact,
  adminRestoreContact,
  adminHardDeleteContact,
  type AdminContactMessage,
  type PageResponse,
} from "@/services/api";

import {
  ArrowLeft,
  Trash2,
  Undo2,
  Eye,
  Inbox,
  Shield,
  CalendarClock,
} from "lucide-react";

const PAGE_SIZE = 10;

export default function AdminContactInbox() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();
  const { toast } = useToast();

  const [page, setPage] = useState(0); // 0-based
  const [includeDeleted, setIncludeDeleted] = useState<"active" | "all" | "deleted">("active");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PageResponse<AdminContactMessage> | null>(null);

  const [preview, setPreview] = useState<AdminContactMessage | null>(null);
  const [confirming, setConfirming] = useState<{
    type: "delete" | "restore" | "hard";
    msg: AdminContactMessage | null;
  }>({ type: "delete", msg: null });

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate("/signin", { replace: true });
    else if (user.role !== "admin") navigate("/403", { replace: true });
  }, [ready, user, navigate]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const resp = await adminListContactMessages(
        page,
        PAGE_SIZE,
        { includeDeleted: includeDeleted !== "active" }
      );

      // If "deleted only", filter client-side for now
      const filtered = includeDeleted === "deleted"
        ? {
            ...resp,
            content: resp.content.filter((m) => m.isDeleted),
            // keep server totals; we're just hiding rows on this page
          }
        : resp;

      setData(filtered);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load inbox", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, includeDeleted]);

  const handleSoftDelete = async (m: AdminContactMessage) => {
    try {
      await adminSoftDeleteContact(m.id);
      toast({ title: "Message archived", description: `Subject: ${m.subject}` });
      await loadPage();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to archive", variant: "destructive" });
    }
  };

  const handleRestore = async (m: AdminContactMessage) => {
    try {
      await adminRestoreContact(m.id);
      toast({ title: "Message restored", description: `Subject: ${m.subject}` });
      await loadPage();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    }
  };

  const handleHardDelete = async (m: AdminContactMessage) => {
    try {
      await adminHardDeleteContact(m.id);
      toast({ title: "Message permanently deleted", description: `Subject: ${m.subject}` });
      await loadPage();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-primary">Contact Inbox</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            Admin-only
          </div>
        </div>

        {/* Filter */}
        <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardDescription>View active, archived, or all messages</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <div className="flex items-center gap-2 w-full md:w-1/3">
              <Select
                value={includeDeleted}
                onValueChange={(v: "active" | "all" | "deleted") => {
                  setIncludeDeleted(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All (incl. archived)</SelectItem>
                  <SelectItem value="deleted">Archived only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading messages...
                    </TableCell>
                  </TableRow>
                ) : !data || data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.content.map((m) => {
                    const d = new Date(m.createdAt);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.email}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={m.subject}>
                            {m.subject}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <CalendarClock className="h-4 w-4" />
                            {d.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.isDeleted ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPreview(m)}>
                              <Eye className="h-4 w-4" />
                            </Button>

                            {!m.isDeleted ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirming({ type: "delete", msg: m })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirming({ type: "restore", msg: m })}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setConfirming({ type: "hard", msg: m })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination (Prev/Next) */}
            {totalPages > 0 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => canPrev && setPage((p) => p - 1)}
                        className={!canPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </div>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => canNext && setPage((p) => p + 1)}
                        className={!canNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Message from {preview?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-sm text-muted-foreground">Subject</div>
              <div className="col-span-3 font-medium">{preview?.subject}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-sm text-muted-foreground">Received</div>
              <div className="col-span-3">
                {preview ? new Date(preview.createdAt).toLocaleString() : ""}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Content</div>
              <Textarea readOnly value={preview?.content || ""} className="min-h-[180px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {!preview?.isDeleted ? (
              <Button
                variant="destructive"
                onClick={() => {
                  if (preview) setConfirming({ type: "delete", msg: preview });
                }}
              >
                Archive
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    if (preview) setConfirming({ type: "restore", msg: preview });
                  }}
                >
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (preview) setConfirming({ type: "hard", msg: preview });
                  }}
                >
                  Delete Permanently
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Archive/Restore/Delete */}
      <Dialog open={!!confirming.msg} onOpenChange={(open) => !open && setConfirming({ type: "delete", msg: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming.type === "delete" && "Archive message?"}
              {confirming.type === "restore" && "Restore message?"}
              {confirming.type === "hard" && "Permanently delete message?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirming.msg?.subject}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming({ type: "delete", msg: null })}>Cancel</Button>
            {confirming.type === "delete" && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirming.msg) return;
                  await handleSoftDelete(confirming.msg);
                  setConfirming({ type: "delete", msg: null });
                }}
              >
                Archive
              </Button>
            )}
            {confirming.type === "restore" && (
              <Button
                onClick={async () => {
                  if (!confirming.msg) return;
                  await handleRestore(confirming.msg);
                  setConfirming({ type: "delete", msg: null });
                }}
              >
                Restore
              </Button>
            )}
            {confirming.type === "hard" && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirming.msg) return;
                  await handleHardDelete(confirming.msg);
                  setConfirming({ type: "delete", msg: null });
                }}
              >
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
