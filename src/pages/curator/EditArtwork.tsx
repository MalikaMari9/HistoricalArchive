import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Upload as SaveIcon,
  Image as ImageIcon,
  Lock,
  X,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  getArtifactById,

  fetchCategorySuggestions,
  fetchCultureSuggestions,
  fetchDepartmentSuggestions,
  fetchPeriodSuggestions,
  updateArtifactMultipart // <- we'll use later when backend is ready
} from "@/services/api";
import { AutocompleteInput } from "@/components/gallery/AutocompleteInput";
import LocationPicker, { LocationInfo } from "@/pages/curator/LocationPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// -------- types --------
type FormValues = {
  title: string;
  category: string;
  description: string;
  culture: string;
  department: string;
  period: string;
  medium: string;
  dimension: string;
  tags: string;              // UI keeps comma string; convert later if needed
  image_url: string;         // keep for preview fallback
};

type ExistingImage = {
  key: string;               // unique key to identify/deleting (use imageid|renditionnumber|index)
  url: string;               // baseimageurl or image_url
  label?: string;
};

export  function EditArtwork() {
  const { user, ready } = useAuthGuard();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      category: "",
      description: "",
      culture: "",
      department: "",
      period: "",
      medium: "",
      dimension: "",
      tags: "",
      image_url: "",
    },
  });

  const [loading, setLoading] = useState(true);

  // suggestions
  const [categories, setCategories] = useState<string[]>([]);
  const [cultures, setCultures] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // images (upload-style)
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [deletedKeys, setDeletedKeys] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // location + date
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({});
  const [foundDate, setFoundDate] = useState<Date | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- role restriction
  useEffect(() => {
    if (ready && user?.role === "visitor") navigate("/403");
  }, [ready, user, navigate]);

  // ---- suggestions
  useEffect(() => {
    const load = async () => {
      setIsLoadingSuggestions(true);
      try {
        const [cats, cul, deps, pers] = await Promise.all([
          fetchCategorySuggestions().catch(() => []),
          fetchCultureSuggestions().catch(() => []),
          fetchDepartmentSuggestions().catch(() => []),
          fetchPeriodSuggestions().catch(() => []),
        ]);
        setCategories(cats.filter(Boolean).sort());
        setCultures(cul.filter(Boolean).sort());
        setDepartments(deps.filter(Boolean).sort());
        setPeriods(pers.filter(Boolean).sort());
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    load();
  }, []);

  // ---- load artifact
  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        const a = await getArtifactById(id);

        // tags: List<String> -> comma string
        const tagsStr =
          Array.isArray(a.tags) && a.tags.length ? a.tags.join(", ") : "";

        reset({
          title: a.title ?? "",
          category: a.category ?? "",
          description: a.description ?? "",
          culture: a.culture ?? "",
          department: a.department ?? "",
          period: a.period ?? "",
          medium: a.medium ?? "",
          dimension: a.dimension ?? "",
          tags: tagsStr,
          image_url: a.image_url ?? (a.images?.[0]?.baseimageurl ?? ""),
        });

        // existing images: image_url + images[]
        const imgs: ExistingImage[] = [];
        if (a.image_url) {
          imgs.push({ key: "image_url", url: a.image_url, label: "Main Image" });
        }
        if (Array.isArray(a.images)) {
          a.images.forEach((im: any, idx: number) => {
            const k = String(im.imageid ?? im.renditionnumber ?? `img-${idx}`);
            const u = im.baseimageurl ?? "";
            if (u) imgs.push({ key: k, url: u, label: im.description ?? undefined });
          });
        }
        setExistingImages(imgs);

        // location
        if (a.location) setLocationInfo(a.location);

        // date
        if (a.exact_found_date) {
          // a.exact_found_date is ISO-YYYY-MM-DD from backend
          setFoundDate(new Date(a.exact_found_date + "T00:00:00"));
        }
      } catch (e) {
        console.error(e);
        toast({
          title: "Error",
          description: "Failed to fetch artwork details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, reset, toast]);

  // ------- image handlers (upload-style) -------
  const validateFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Only image files are allowed",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // total cap 5: existing - deleted + new
    const currentCount =
      existingImages.filter((im) => !deletedKeys.includes(im.key)).length +
      newFiles.length;

    const accepted: File[] = [];
    for (const f of files) {
      if (!validateFile(f)) continue;
      if (currentCount + accepted.length >= 5) {
        toast({
          title: "Too many images",
          description: "Maximum 5 images allowed",
          variant: "destructive",
        });
        break;
      }
      accepted.push(f);
    }
    if (!accepted.length) return;

    setNewFiles((prev) => [...prev, ...accepted]);

    // generate previews
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setNewPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });

    // allow re-selecting the same file later
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExisting = (key: string) => {
    setDeletedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const restoreExisting = (key: string) => {
    setDeletedKeys((prev) => prev.filter((k) => k !== key));
  };

  const removeNew = (idx: number) => {
    const nf = [...newFiles];
    const np = [...newPreviews];
    nf.splice(idx, 1);
    np.splice(idx, 1);
    setNewFiles(nf);
    setNewPreviews(np);
  };

  // merged preview count (after deletions)
  const remainingExisting = existingImages.filter(
    (im) => !deletedKeys.includes(im.key)
  );
  const totalAfterChange = remainingExisting.length + newFiles.length;

  // live fallback preview if user edits image_url text (kept for compatibility)
  const urlPreview = useMemo(() => {
    const u = watch("image_url");
    return (u || "").trim();
  }, [watch]);

  // ------- submit -------
const onSubmit = async (values: FormValues) => {
  if (!id) return;

  if (!values.title.trim() || !values.category.trim()) {
    toast({
      title: "Missing fields",
      description: "Title and Category are required.",
      variant: "destructive",
    });
    return;
  }

  // total image count check
  const remaining = existingImages.filter(im => !deletedKeys.includes(im.key));
  const totalCount = remaining.length + newFiles.length;
  if (totalCount === 0) {
    toast({
      title: "No images",
      description: "At least one image is required",
      variant: "destructive",
    });
    return;
  }

  try {
    const form = new FormData();

    form.append("title", values.title);
    form.append("category", values.category);
    form.append("description", values.description);
    form.append("culture", values.culture);
    form.append("department", values.department);
    form.append("period", values.period);
    form.append("medium", values.medium);
    form.append("dimension", values.dimension);

    if (values.tags?.trim()) {
      form.append("tags", values.tags); // backend splits it
    }

    if (locationInfo && Object.keys(locationInfo).length > 0) {
      form.append("location", JSON.stringify(locationInfo));
    }

    if (foundDate) {
      form.append("exact_found_date", foundDate.toISOString().split("T")[0]);
    }

    // add new images
    newFiles.forEach((f) => {
      form.append("files", f);
    });

    // tell backend which existing images to delete
    if (deletedKeys.length > 0) {
      deletedKeys.forEach((k) => form.append("deleteImages", k));
    }

    // call multipart update endpoint
    await updateArtifactMultipart(id, form);

    toast({ title: "Success", description: "Artwork updated successfully" });
    navigate("/curator/artworks");
  } catch (err) {
    console.error(err);
    toast({
      title: "Error",
      description: "Failed to update artwork",
      variant: "destructive",
    });
  }
};


  // --------- guards & layout ---------
  if (!ready) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-lg">Loading artwork details...</div>
        </div>
      </div>
    );
  }

  if (!user?.username) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-medium">Authentication Required</h3>
              <p className="text-muted-foreground">Please login to edit artwork</p>
              <Button onClick={() => navigate("/login")}>Go to Login</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Edit Artwork</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {user.username && <>Logged in as: {user.username}</>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SaveIcon className="h-5 w-5" />
                Artwork Details
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* IMAGES (upload-style) */}
                <div className="space-y-2">
                  <Label>Artwork Images (max 5)</Label>

                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    {/* existing images */}
                    {remainingExisting.length > 0 && (
                      <div className="mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {remainingExisting.map((img) => (
                            <div key={img.key} className="relative group">
                              <img
                                src={img.url}
                                alt={img.label || img.key}
                                className="w-full h-32 object-cover rounded-lg"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = "/placeholder-art.jpg";
                                }}
                              />
                              <button
                                type="button"
                                className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-white w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeExisting(img.key)}
                                title="Remove this image"
                              >
                                <X className="h-4 w-4 mx-auto" />
                              </button>
                              {img.label && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                  {img.label}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* show restore chips for removed ones */}
                        {deletedKeys.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {deletedKeys.map((k) => (
                              <button
                                key={k}
                                type="button"
                                className="text-xs px-2 py-1 rounded border hover:bg-accent"
                                onClick={() => restoreExisting(k)}
                              >
                                Restore {k}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* new images */}
                    {newPreviews.length > 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {newPreviews.map((preview, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={preview}
                                alt={`New ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-white w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeNew(idx)}
                                title="Remove"
                              >
                                <X className="h-4 w-4 mx-auto" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* empty-state */}
                    {remainingExisting.length === 0 && newPreviews.length === 0 && (
                      <div className="text-center space-y-4">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Add images to show your artwork
                        </p>
                      </div>
                    )}

                    {/* add button (hidden input) */}
                    <div className="text-center mt-4">
                      <Label
                        htmlFor="edit-files"
                        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                      >
                        Add Images
                      </Label>
                      <Input
                        id="edit-files"
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={onPickFiles}
                        className="hidden"
                        ref={fileInputRef}
                        disabled={isSubmitting}
                      />
                      <div className="text-xs text-muted-foreground mt-2">
                        JPEG/PNG up to 10MB each (max 5 total)
                      </div>
                    </div>

                    {/* info message while backend not ready */}
                    {(deletedKeys.length > 0 || newFiles.length > 0) && (
                      <p className="mt-3 text-xs text-amber-600">
                        You modified images. Saving is disabled until the backend supports multipart updates.
                      </p>
                    )}
                  </div>
                </div>

                {/* REQUIRED */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" {...register("title")} required disabled={isSubmitting} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <AutocompleteInput
                      id="category"
                      value={watch("category")}
                      onChange={(v) => setValue("category", v, { shouldDirty: true })}
                      suggestions={categories}
                      disabled={isSubmitting || isLoadingSuggestions}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea id="description" rows={4} {...register("description")} required disabled={isSubmitting} />
                  </div>
                </div>

                {/* OPTIONAL */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="culture">Culture</Label>
                      <AutocompleteInput
                        id="culture"
                        value={watch("culture")}
                        onChange={(v) => setValue("culture", v, { shouldDirty: true })}
                        suggestions={cultures}
                        disabled={isSubmitting || isLoadingSuggestions}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period">Period</Label>
                      <AutocompleteInput
                        id="period"
                        value={watch("period")}
                        onChange={(v) => setValue("period", v, { shouldDirty: true })}
                        suggestions={periods}
                        disabled={isSubmitting || isLoadingSuggestions}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department/Collection</Label>
                    <AutocompleteInput
                      id="department"
                      value={watch("department")}
                      onChange={(v) => setValue("department", v, { shouldDirty: true })}
                      suggestions={departments}
                      disabled={isSubmitting || isLoadingSuggestions}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medium">Medium</Label>
                    <Input id="medium" {...register("medium")} disabled={isSubmitting} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dimension">Dimensions</Label>
                    <Input id="dimension" {...register("dimension")} disabled={isSubmitting} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" placeholder="comma, separated, tags" {...register("tags")} disabled={isSubmitting} />
                  </div>

                  {/* Location (same as Upload) */}
                  <div className="space-y-2">
                    <Label>Current Location</Label>
                    <LocationPicker value={locationInfo} onChange={setLocationInfo} disabled={isSubmitting} />
                  </div>

                  {/* Date (same as Upload) */}
                  <div className="space-y-2">
                    <Label>Creation/Discovery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !foundDate && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {foundDate ? format(foundDate, "PPP") : <span>Select a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={foundDate}
                          onSelect={setFoundDate}
                          initialFocus
                          fromYear={1600}
                          toYear={new Date().getFullYear()}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      isSubmitting ||
                      isLoadingSuggestions //||
                     // deletedKeys.length > 0 ||
                      //newFiles.length > 0 // disable until backend accepts multipart
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>

                {/* Fallback preview area for current image_url (kept for now) */}
                <div className="border rounded-md p-3">
                  <Label className="mb-2 block">Current Primary Image (URL fallback)</Label>
                  {urlPreview ? (
                    <img
                      src={urlPreview}
                      alt="Primary"
                      className="w-full h-48 object-cover rounded"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder-art.jpg";
                      }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      No primary URL
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* small footnote */}
         
        </div>
      </div>
    </div>
  );
}
