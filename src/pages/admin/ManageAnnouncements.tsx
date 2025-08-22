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
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  deleteAnnouncement,
  listAllAnnouncements,
  updateAnnouncement,
  type AnnouncementDto,
} from "@/services/api";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Edit,
  Megaphone,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useNavigate } from "react-router-dom";
// Remove the interface and sample data - we'll use AnnouncementDto from API

const ITEMS_PER_PAGE = 5;

export default function ManageAnnouncements() {
    const navigate = useNavigate();
  const { user, ready } = useAuthGuard();
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<AnnouncementDto | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "" as AnnouncementDto["type"],
    summary: "",
    scheduledAt: "",
  });
  const { toast } = useToast();

  // Load announcements on component mount
  useEffect(() => {
    loadAnnouncements();
  }, []);

     useEffect(() => {
    if (!ready) return;

    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.role !== "admin") {
      navigate("/403", { replace: true });
    }
  }, [ready, user, navigate]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await listAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(announcements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAnnouncements = announcements.slice(startIndex, endIndex);

  const getTypeBadge = (type: AnnouncementDto["type"]) => {
    switch (type) {
      case "maintenance":
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 hover:bg-orange-200"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Maintenance
          </Badge>
        );
      case "feature":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            <Zap className="w-3 h-3 mr-1" />
            Feature
          </Badge>
        );
      case "event":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 hover:bg-green-200"
          >
            <Calendar className="w-3 h-3 mr-1" />
            Event
          </Badge>
        );
    }
  };

  const handleEdit = (id: number) => {
    const announcement = announcements.find((a) => a.id === id);
    if (announcement) {
      setEditingAnnouncement(announcement);
      // Format the datetime for the input field (ISO format without timezone)
      const scheduledDate = new Date(announcement.scheduledAt);
      const formattedDateTime = scheduledDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

      setEditForm({
        title: announcement.title,
        type: announcement.type,
        summary: announcement.summary,
        scheduledAt: formattedDateTime,
      });
    }
  };

  const handleEditSubmit = async () => {
    if (!editingAnnouncement) return;

    try {
      // Convert the datetime-local input back to ISO string
      const scheduledDate = new Date(editForm.scheduledAt);
      const isoString = scheduledDate.toISOString();

      await updateAnnouncement(editingAnnouncement.id, {
        title: editForm.title,
        type: editForm.type,
        summary: editForm.summary,
        dateTimeISO: isoString,
      });

      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });

      setEditingAnnouncement(null);
      loadAnnouncements();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    }
  };

  const handleEditCancel = () => {
    setEditingAnnouncement(null);
    setEditForm({
      title: "",
      type: "" as AnnouncementDto["type"],
      summary: "",
      scheduledAt: "",
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      // Reload announcements
      loadAnnouncements();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationItems = () => {
    const items = [];
    const showEllipsis = totalPages > 7;

    if (showEllipsis) {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is far from start
      if (currentPage > 4) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 3) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  };

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
              <Megaphone className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-primary">
                Manage Announcements
              </h1>
            </div>
          </div>
          <Link to="/admin/announcements/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Announcement
            </Button>
          </Link>
        </div>

        {/* Announcements Table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>All Announcements</CardTitle>
            <CardDescription>
              View and manage all system announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading announcements...
                    </TableCell>
                  </TableRow>
                ) : currentAnnouncements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No announcements found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentAnnouncements.map((announcement) => {
                    const scheduledDate = new Date(announcement.scheduledAt);
                    return (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">
                          {announcement.title}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate"
                            title={announcement.summary}
                          >
                            {announcement.summary}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                        <TableCell>
                          {scheduledDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {scheduledDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(announcement.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(announcement.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {renderPaginationItems()}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
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

      {/* Edit Modal */}
      <Dialog
        open={!!editingAnnouncement}
        onOpenChange={(open) => !open && handleEditCancel()}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Announcement title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={editForm.type}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    type: value as AnnouncementDto["type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select announcement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Scheduled Date & Time
              </label>
              <Input
                type="datetime-local"
                value={editForm.scheduledAt}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    scheduledAt: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.summary}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Announcement description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
