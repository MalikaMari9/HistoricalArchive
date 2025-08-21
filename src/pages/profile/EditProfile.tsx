import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowLeft, Upload, User, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { getMyProfile, updateMyProfile, type ProfileDto } from "@/services/api";

/* --------------------------------- Schema --------------------------------- */
// NB: We validate text fields with zod; file validation is handled client-side before submit.
const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  profilePicture: z.any().optional(), // not registered in RHF (we use manual <input type="file" />)
});

type FormData = z.infer<typeof formSchema>;

/* ------------------------------- Constants -------------------------------- */

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"]; // allow webp too
const PLACEHOLDER_AVATAR = null as string | null; // null => AvatarFallback

/* ------------------------------- Component -------------------------------- */

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // image preview URL (blob) or absolute URL from server; null => show fallback
  const [profileImage, setProfileImage] = useState<string | null>(PLACEHOLDER_AVATAR);
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false); // user explicitly removed picture
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null); // track blob URL to revoke later

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "" },
    mode: "onBlur",
  });

  /* -------------------------- Helpers / Validations ------------------------- */

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setPreviewFromFile = useCallback((f: File) => {
    revokeObjectUrl();
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setProfileImage(url);
  }, [revokeObjectUrl]);

  const validateFile = (f: File): string | null => {
    if (!ACCEPT_TYPES.includes(f.type)) {
      return "Please upload an image file (JPG, PNG, or WEBP)";
    }
    if (f.size > MAX_BYTES) {
      return "Maximum file size is 2MB";
    }
    return null;
  };

  /* ------------------------------ Data loading ----------------------------- */

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const data = await getMyProfile({ signal: ac.signal });

        // populate form
        form.reset({
          username: data.username ?? "",
          email: data.email ?? "",
        });

        // profile picture absolute URL (if provided as a path)
        if (data.profilePicture) {
          // backend returns '/files/...' → server absolute URL helper below
          setProfileImage(toAbsoluteMediaUrl(data.profilePicture));
        } else {
          setProfileImage(PLACEHOLDER_AVATAR);
        }
      } catch (err) {
        if ((err as any)?.name !== "CanceledError") {
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      ac.abort();
      revokeObjectUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------- Handlers -------------------------------- */

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const error = validateFile(selected);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      // reset the input so same file can be re-selected
      e.target.value = "";
      return;
    }

    setFile(selected);
    setRemoved(false); // user provided a new image → not removed
    setPreviewFromFile(selected);
  };

  const handleRemovePicture = () => {
    // UI: show fallback immediately
    setFile(null);
    setRemoved(true);
    setProfileImage(PLACEHOLDER_AVATAR);
    revokeObjectUrl();

    // also clear input value so user can re-upload the same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);

      // Build multipart form
      const body = new FormData();

      // JSON part
      const profilePayload: Pick<ProfileDto, "username" | "email"> & { profilePicture?: null } = {
        username: values.username,
        email: values.email,
      };
      // “explicit removal” contract: send profilePicture: null inside profile JSON
      if (removed && !file) {
        profilePayload.profilePicture = null;
      }
      body.append("profile", JSON.stringify(profilePayload));

      // File part (if any)
      if (file) body.append("file", file);

      const updated = await updateMyProfile(body);

      // sync UI with server response
      if (updated.profilePicture) {
        setProfileImage(toAbsoluteMediaUrl(updated.profilePicture));
        setRemoved(false);
      } else {
        setProfileImage(PLACEHOLDER_AVATAR);
        setRemoved(true);
      }

      toast({ title: "Success", description: "Profile updated successfully!" });
      navigate("/profile");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------------- Render -------------------------------- */

  if (loading && !form.formState.isDirty) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-24 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-32 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-10 w-32" />
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 hover:bg-muted"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    {profileImage ? (
                      <AvatarImage
                        src={profileImage}
                        alt="Profile"
                        className="object-cover"
                        onError={() => setProfileImage(PLACEHOLDER_AVATAR)}
                      />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex gap-2 whitespace-nowrap">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleUploadClick}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {profileImage ? "Change" : "Upload"}
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_TYPES.join(",")}
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                    />

                    {profileImage && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 2MB</p>
                </div>

                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} className="disabled:opacity-75" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={isSubmitting} className="disabled:opacity-75" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- Utilities -------------------------------- */

// Turn '/something' into 'http://localhost:8080/something'
function toAbsoluteMediaUrl(pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `http://localhost:8080${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
