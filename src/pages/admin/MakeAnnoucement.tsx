import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  FileText,
  Megaphone,
  Tags,
  Type,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type AnnouncementDto,
} from "@/services/api";

const AnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(["maintenance", "feature", "event"]),
  date: z.date({ required_error: "Please pick a date and time" }),
  time: z.string().regex(/^\d{2}:\d{2}$/g, "Use 24h format HH:MM"),
  summary: z.string().min(10, "Please add a short description"),
  tags: z.string().optional(),
});

type AnnouncementForm = z.infer<typeof AnnouncementSchema>;

export default function MakeAnnouncement() {
  const [published, setPublished] = React.useState<AnnouncementDto[]>([]);
  const [editTarget, setEditTarget] = React.useState<AnnouncementDto | null>(
    null
  );
  const [editTitle, setEditTitle] = React.useState("");
  const [deleteTarget, setDeleteTarget] =
    React.useState<AnnouncementDto | null>(null);
  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(AnnouncementSchema),
    defaultValues: {
      title: "",
      type: "feature",
      date: new Date(),
      time: new Date().toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      summary: "",
      tags: "",
    },
  });

  const watch = form.watch();

  React.useEffect(() => {
    document.title = "Make Announcement | Admin";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "Create a new announcement to notify users about updates, events, or maintenance."
      );
    // load published
    (async () => {
      try {
        const data = await listAnnouncements();
        setPublished(data);
      } catch {}
    })();
  }, []);

  async function onSubmit(values: AnnouncementForm) {
    // Combine date and time into ISO string for demonstration
    const [hours, minutes] = values.time.split(":").map((n) => parseInt(n, 10));
    const scheduled = new Date(values.date);
    scheduled.setHours(hours, minutes, 0, 0);

    const payload = {
      ...values,
      dateTimeISO: scheduled.toISOString(),
      tags:
        values.tags
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [],
    };

    try {
      const apiPayload = {
        title: values.title,
        type: values.type,
        dateTimeISO: scheduled.toISOString(),
        summary: values.summary,
        tagsCsv: (values.tags ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(","),
      };
      const created = await createAnnouncement(apiPayload);
      toast({
        title: "Announcement published",
        description: `“${created.title}” scheduled for ${format(
          scheduled,
          "PPpp"
        )}`,
      });
      form.reset();
      // refresh list
      const data = await listAnnouncements();
      setPublished(data);
    } catch (e: any) {
      toast({
        title: "Failed to publish",
        description: String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="mb-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
              </Link>
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 inline-flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" /> Make Announcement
            </h1>
            <p className="text-muted-foreground">
              Notify users about product updates, events, and maintenance.
            </p>
          </div>
        </header>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 bg-card p-6 rounded-xl border"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <Type className="h-4 w-4" /> Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Scheduled Maintenance – Aug 15"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Keep it concise and informative.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="inline-flex items-center gap-2">
                      <Tags className="h-4 w-4" /> Type
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (24h)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        step="60"
                        placeholder="14:00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Briefly describe the announcement..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide context or instructions users should know.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., database, performance"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated keywords to categorize the announcement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
              <Button type="submit" className="hover-scale">
                Publish
              </Button>
            </div>
          </form>
          <aside className="mt-8">
            <div className="rounded-xl border bg-muted/20 p-5">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Live preview
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary capitalize">
                    {watch.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {watch.date ? format(watch.date, "PP") : "Pick a date"}{" "}
                    {watch.time}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {watch.title || "Your announcement title"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {watch.summary || "A brief description will appear here."}
                </p>
              </div>
            </div>
          </aside>
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">
              Published announcements
            </h2>
            <div className="space-y-3">
              {published.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.scheduledAt).toLocaleString()} • {p.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditTarget(p);
                        setEditTitle(p.title);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(p)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {published.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No announcements yet.
                </div>
              )}
            </div>
          </section>
        </Form>
      </div>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Make Announcement",
            description:
              "Create a new announcement to notify users about updates, events, or maintenance.",
          }),
        }}
      />
      {/* Edit Modal */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editTarget) return;
                if (editTitle.trim().length < 3) return;
                await updateAnnouncement(editTarget.id, {
                  title: editTitle.trim(),
                });
                const data = await listAnnouncements();
                setPublished(data);
                setEditTarget(null);
                toast({
                  title: "Updated",
                  description: "Announcement updated.",
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete “{deleteTarget?.title}”?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteAnnouncement(deleteTarget.id);
                const data = await listAnnouncements();
                setPublished(data);
                setDeleteTarget(null);
                toast({
                  title: "Deleted",
                  description: "Announcement removed.",
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
