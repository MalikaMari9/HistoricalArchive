import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Upload, Image as ImageIcon, CalendarIcon, Lock, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { AutocompleteInput } from "@/components/gallery/AutocompleteInput";
import {
  fetchCategorySuggestions,
  fetchCultureSuggestions,
  fetchDepartmentSuggestions,
  fetchPeriodSuggestions,
  checkUploadSession,
  uploadLogin,
  uploadLogout,
  uploadArtifact,
} from "@/services/api";

interface UploadFormData {
  title: string;
  description: string;
  dimension: string;
  category: string;
  tags: string;
  culture: string;
  department: string;
  period: string;
  location: string;
  medium: string;
  files: File[];
}

export default function UploadArtifact() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: "",
    description: "",
    dimension: "",
    category: "",
    tags: "",
    culture: "",
    department: "",
    period: "",
    location: "",
    medium: "",
    files: [],
  });

  const [previews, setPreviews] = useState<string[]>([]);
  const [foundDate, setFoundDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // DB-driven suggestions
  const [categories, setCategories] = useState<string[]>([]);
  const [cultures, setCultures] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // On mount: check session + load suggestions
  useEffect(() => {
    (async () => {
      try {
        const username = await checkUploadSession();
        if (username) setCurrentUser(username);
      } catch {
        // silent—session check is best-effort
      }
    })();
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const [categoriesData, culturesData, departmentsData, periodsData] = await Promise.all([
        fetchCategorySuggestions().catch(() => []),
        fetchCultureSuggestions().catch(() => []),
        fetchDepartmentSuggestions().catch(() => []),
        fetchPeriodSuggestions().catch(() => []),
      ]);

      setCategories(categoriesData.filter(Boolean).sort());
      setCultures(culturesData.filter(Boolean).sort());
      setDepartments(departmentsData.filter(Boolean).sort());
      setPeriods(periodsData.filter(Boolean).sort());
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast({
        title: "Warning",
        description: "Could not load field suggestions from database",
        variant: "default",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleLogin = async (username: string) => {
    if (!username.trim()) return;
    try {
      await uploadLogin(username);
      setCurrentUser(username);
      setShowLoginPopup(false);
      setUsernameInput("");
      toast({ title: "Login successful", description: `You are now logged in as ${username}` });
    } catch {
      toast({ title: "Login failed", description: "Could not establish session", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await uploadLogout();
      setCurrentUser(null);
      toast({ title: "Logged out", description: "You have been logged out" });
    } catch {
      toast({ title: "Logout failed", description: "Could not end session properly", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate & limit
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file type", description: "Only image files are allowed", variant: "destructive" });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return false;
      }
      return true;
    });

    if (formData.files.length + validFiles.length > 5) {
      toast({ title: "Too many files", description: "Maximum 5 images allowed", variant: "destructive" });
      return;
    }

    setFormData((prev) => ({ ...prev, files: [...prev.files, ...validFiles] }));

    // Previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newFiles = [...formData.files];
    newFiles.splice(index, 1);

    const newPreviews = [...previews];
    newPreviews.splice(index, 1);

    setFormData((prev) => ({ ...prev, files: newFiles }));
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({ title: "Authentication required", description: "Please login to upload artwork", variant: "destructive" });
      setShowLoginPopup(true);
      return;
    }

    // Basic validation
    if (!formData.files.length) {
      toast({ title: "No images", description: "Please upload at least one image", variant: "destructive" });
      return;
    }
    if (!formData.title || !formData.description || !formData.category) {
      toast({ title: "Missing required fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("description", formData.description);
      fd.append("dimension", formData.dimension);
      fd.append("category", formData.category);
      fd.append("tags", formData.tags);
      fd.append("culture", formData.culture);
      fd.append("department", formData.department);
      fd.append("period", formData.period);
      fd.append("location", formData.location);
      fd.append("medium", formData.medium);

      if (foundDate) {
        const ymd = foundDate.toISOString().split("T")[0];
        fd.append("exact_found_date", ymd);
      }

      formData.files.forEach((file) => fd.append("files", file));

      const result = await uploadArtifact(fd);
      toast({ title: "Success", description: "Artwork uploaded successfully!" });
      navigate(`/artwork/${result.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload artwork",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Upload New Artwork</h1>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Logged in as: {currentUser}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={isSubmitting}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowLoginPopup(true)}>
              Login
            </Button>
          )}
        </div>

        {/* Suggestions Loading */}
        {isLoadingSuggestions && (
          <div className="flex items-center justify-center py-4 mb-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading field suggestions...</span>
          </div>
        )}

        {/* Login Popup */}
        {showLoginPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Login Required</h3>
                <p className="text-sm text-muted-foreground">Please enter your username to upload artwork</p>
                <Input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin(usernameInput)}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowLoginPopup(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleLogin(usernameInput)} disabled={!usernameInput.trim()}>
                    Login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentUser ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Artwork Details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Files */}
                  <div className="space-y-2">
                    <Label htmlFor="files">Artwork Images (max 5)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6">
                      {previews.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {previews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-white w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeImage(index)}
                                >
                                  ×
                                </Button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                  {formData.files[index].name}
                                </div>
                              </div>
                            ))}
                          </div>
                          {formData.files.length < 5 && (
                            <div className="text-center">
                              <Label
                                htmlFor="files"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                              >
                                Add More Images
                              </Label>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <Label
                              htmlFor="files"
                              className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                              Select Images
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">JPEG, PNG up to 10MB each (max 5 images)</p>
                        </div>
                      )}
                      <Input
                        id="files"
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Required */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter artwork title"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your artwork..."
                        rows={4}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <AutocompleteInput
                        id="category"
                        value={formData.category}
                        onChange={(value) => setFormData({ ...formData, category: value })}
                        suggestions={categories}
                        disabled={isSubmitting || isLoadingSuggestions}
                      />
                    </div>
                  </div>

                  {/* Optional */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="medium">Medium</Label>
                      <Input
                        id="medium"
                        value={formData.medium}
                        onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                        placeholder="e.g., Oil on canvas, Bronze"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dimension">Dimensions</Label>
                      <Input
                        id="dimension"
                        value={formData.dimension}
                        onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                        placeholder="e.g., 24 x 36 inches"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="abstract, modern, landscape (comma separated)"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="culture">Culture</Label>
                        <AutocompleteInput
                          id="culture"
                          value={formData.culture}
                          onChange={(value) => setFormData({ ...formData, culture: value })}
                          suggestions={cultures}
                          disabled={isSubmitting || isLoadingSuggestions}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="period">Period</Label>
                        <AutocompleteInput
                          id="period"
                          value={formData.period}
                          onChange={(value) => setFormData({ ...formData, period: value })}
                          suggestions={periods}
                          disabled={isSubmitting || isLoadingSuggestions}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department/Collection</Label>
                      <AutocompleteInput
                        id="department"
                        value={formData.department}
                        onChange={(value) => setFormData({ ...formData, department: value })}
                        suggestions={departments}
                        disabled={isSubmitting || isLoadingSuggestions}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Current Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Museum of Modern Art, New York"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Creation/Discovery Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !foundDate && "text-muted-foreground")}
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {foundDate ? format(foundDate, "PPP") : <span>Select a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={foundDate} onSelect={setFoundDate} initialFocus disabled={isSubmitting} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1" disabled={isSubmitting || isLoadingSuggestions}>
                      {isSubmitting ? (
                        <>
                          <Upload className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Artwork
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-medium">Authentication Required</h3>
              <p className="text-muted-foreground">Please login to upload artwork</p>
              <Button onClick={() => setShowLoginPopup(true)}>Login</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
