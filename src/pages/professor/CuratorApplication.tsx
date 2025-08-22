import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Download, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  professorListPendingCuratorsApplication,
  professorApproveCuratorApp,
  professorRejectCuratorApp,
  type ProfessorPendingCurator,
} from "@/services/api";

export default function CuratorApplications() {
  const navigate = useNavigate();
  const { user, ready } = useAuthGuard();
  const { id: focusIdParam } = useParams();
  const focusId = focusIdParam ? Number(focusIdParam) : null;

  const [applications, setApplications] = useState<ProfessorPendingCurator[]>([]);
  const [selected, setSelected] = useState<ProfessorPendingCurator | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [highlightId, setHighlightId] = useState<number | null>(null);

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


  // Load data
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await professorListPendingCuratorsApplication({ signal: controller.signal });
        setApplications(data);
      } catch (e: any) {
        if (e?.name === "AbortError" || e?.name === "CanceledError") return;
        setError("Failed to fetch curator applications");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Scroll to focus row (from /:id) and briefly highlight
  useEffect(() => {
    if (loading || !focusId) return;
    const exists = applications.some((a) => a.applicationId === focusId);
    if (!exists) {
      toast({ title: "Not found", description: `Application #${focusId} is not in the pending list.` });
      return;
    }
    const t = requestAnimationFrame(() => {
      const el = document.getElementById(`row-${focusId}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setHighlightId(focusId);
        setTimeout(() => setHighlightId(null), 2000);
      }
    });
    return () => cancelAnimationFrame(t);
  }, [loading, focusId, applications]);

  async function handleApprove(id: number) {
    try {
      await professorApproveCuratorApp(id);
      toast({ title: "Approved!", description: `Application #${id} was approved.` });
      setApplications((prev) => prev.filter((a) => a.applicationId !== id));
      setShowApproveDialog(false);
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Approval failed", variant: "destructive" });
    }
  }

  async function handleReject(id: number, reason: string) {
    try {
      await professorRejectCuratorApp(id, reason);
      toast({ title: "Rejected!", description: `Application #${id} was rejected.` });
      setApplications((prev) => prev.filter((a) => a.applicationId !== id));
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelected(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Rejection failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Curator Applications</h1>
          <p className="text-muted-foreground">Review and manage upgrade to curator requests</p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Educational Background</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            )}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} className="text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}

            {!loading && !error && applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No pending curator applications.</TableCell>
              </TableRow>
            )}

            {!loading &&
              !error &&
              applications.map((app) => (
                <TableRow
                  key={app.applicationId}
                  id={`row-${app.applicationId}`}
                  className={
                    highlightId === app.applicationId
                      ? "ring-2 ring-primary/60 transition-[box-shadow] duration-700"
                      : ""
                  }
                >
                  <TableCell className="font-medium">{app.fname}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell className="max-w-xs truncate">{app.educationalBackground}</TableCell>
                  <TableCell>{app.submittedAt ? dateFmt.format(new Date(app.submittedAt)) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pending</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* View details (Dialog is controlled below) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelected(app);
                          setShowApproveDialog(false);
                          setShowRejectDialog(false);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelected(app);
                          setShowApproveDialog(true);
                        }}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(app);
                          setRejectionReason("");
                          setShowRejectDialog(true);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* Details + Actions Dialog (opens when user clicks "View Details") */}
      {selected && !showApproveDialog && !showRejectDialog && (
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details — {selected.fname}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Full Name</h4>
                  <p className="text-muted-foreground">{selected.fname}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <p className="text-muted-foreground">{selected.email}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Educational Background</h4>
                <p className="text-muted-foreground">{selected.educationalBackground}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Professional Experience</h4>
                <p className="text-muted-foreground">{selected.personalExperience}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Motivation</h4>
                <p className="text-muted-foreground">{selected.motivationReason}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Portfolio</h4>
                <a
                  href={selected.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {selected.portfolioLink}
                </a>
              </div>

              {selected.certificationPath && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">CV Document:</p>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {selected.certificationPath.split("/").pop()}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selected.certificationPath, "_blank")}
                        className="h-8"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = selected.certificationPath;
                          a.download = selected.certificationPath.split("/").pop() ?? "cv.pdf";
                          a.click();
                        }}
                        className="h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-1">Submitted Date</h4>
                <p className="text-muted-foreground">
                  {selected.submittedAt ? dateFmt.format(new Date(selected.submittedAt)) : "—"}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowApproveDialog(true)}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setRejectionReason("");
                    setShowRejectDialog(true);
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p>
                Approve curator application for <strong>{selected.fname}</strong> ({selected.email})?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(selected.applicationId)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Confirm Approve
                </Button>
                <Button variant="ghost" onClick={() => setShowApproveDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Provide a reason for rejecting this application.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full p-2 border rounded-md"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selected.applicationId, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
