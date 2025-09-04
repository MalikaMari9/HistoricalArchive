import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { applyForCurator, getMyPublicProfile, type ViewUserProfile, getCuratorApplicationStatus } from "@/services/api";

/* --------------------------------- Limits --------------------------------- */

const LIMITS = {
  fullName: 100, // fname in DB
  text: 400,     // educational_background, certification, personal_experience, portfolio_link, motivation_reason
};

const MAX_CV_MB = 5;
const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/* ----------------------------- Zod Validation ----------------------------- */

const formSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name is required")
    .max(LIMITS.fullName, `Full name must be ${LIMITS.fullName} characters or less`),
  educationalBackground: z
    .string()
    .min(10, "Please provide details about your educational background")
    .max(LIMITS.text, `Must be ${LIMITS.text} characters or less`),
  // Optional, but when present must respect the cap
  professionalCertifications: z
    .string()
    .max(LIMITS.text, `Must be ${LIMITS.text} characters or less`)
    .optional()
    .or(z.literal("")), // allow empty string
  relevantExperience: z
    .string()
    .min(10, "Please describe your relevant experience")
    .max(LIMITS.text, `Must be ${LIMITS.text} characters or less`),
  portfolioWork: z
    .string()
    .min(10, "Please describe your portfolio or previous work")
    .max(LIMITS.text, `Must be ${LIMITS.text} characters or less`),
  motivation: z
    .string()
    .min(20, "Please explain why you want to become a curator")
    .max(LIMITS.text, `Must be ${LIMITS.text} characters or less`),
});

type FormData = z.infer<typeof formSchema>;

/* ------------------------------ Small Helpers ----------------------------- */

function Counter({
  value,
  max,
  className = "",
}: {
  value: string | undefined;
  max: number;
  className?: string;
}) {
  const len = (value ?? "").length;
  const over = len > max;
  return (
    <p
      aria-live="polite"
      className={`text-xs text-right mt-1 ${over ? "text-destructive" : "text-muted-foreground"} ${className}`}
    >
      {len} / {max}
    </p>
  );
}

/* -------------------------------- Component ------------------------------- */

export default function UpgradeCurator() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<"pending" | "accepted" | "rejected" | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const acRef = useRef<AbortController | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      educationalBackground: "",
      professionalCertifications: "",
      relevantExperience: "",
      portfolioWork: "",
      motivation: "",
    },
    mode: "onChange",
  });

  const isSubmitting = form.formState.isSubmitting;

  /* --------------------------- Prefetch user email ------------------------- */
  useEffect(() => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    (async () => {
      try {
        setBootLoading(true);
        const me: ViewUserProfile = await getMyPublicProfile({ signal: ac.signal });
        setUserEmail(me.email ?? null);

        try {
          const status = await getCuratorApplicationStatus();
          setApplicationStatus(status); // "pending" | "accepted" | "rejected" | null
        } catch (err) {
          console.error("Failed to fetch application status", err);
        }
      } catch (err: any) {
        toast({
          title: "Session Required",
          description: "Please sign in to submit a curator application.",
          variant: "destructive",
        });
        navigate("/signin");
        return;
      } finally {
        setBootLoading(false);
        setStatusLoading(false);
      }
    })();

    return () => ac.abort();
  }, [navigate, toast]);

  /* ------------------------------ Handlers -------------------------------- */

  function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCvFile(null);
      return;
    }
    // Type check
    if (!ALLOWED_CV_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF or Word document (.pdf, .doc, .docx).",
        variant: "destructive",
      });
      e.target.value = "";
      setCvFile(null);
      return;
    }
    // Size check
    const maxBytes = MAX_CV_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_CV_MB}MB.`,
        variant: "destructive",
      });
      e.target.value = "";
      setCvFile(null);
      return;
    }
    setCvFile(file);
  }

  function clearForm() {
    form.reset();
    setCvFile(null);
  }

  async function onSubmit(data: FormData) {
    // Build multipart body for Spring endpoint
    const body = new FormData();
    body.append(
      "data",
      new Blob(
        [
          JSON.stringify({
            fname: data.fullName, // <= fname (100 char cap)
            // TODO: replace with real DOB field when you add it to the form
            dob: new Date().toISOString().split("T")[0],
            educationalBackground: data.educationalBackground, // <= 400
            certification: data.professionalCertifications || "", // <= 400
            personalExperience: data.relevantExperience, // <= 400
            portfolioLink: data.portfolioWork, // <= 400
            motivationReason: data.motivation, // <= 400
          }),
        ],
        { type: "application/json" }
      )
    );
    if (cvFile) body.append("certificationFile", cvFile);

    try {
      await applyForCurator(body);
      toast({
        title: "Application Submitted",
        description: "Your curator application has been submitted successfully. We'll review it within 5–7 days.",
      });
      navigate("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        "Failed to submit application. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  const emailDisplay = useMemo(() => userEmail ?? "Loading…", [userEmail]);

  /* -------------------------------- Render -------------------------------- */

  if (bootLoading || statusLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (applicationStatus === "pending") {
    return (
      <div className="p-6 text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Application Already Submitted</h2>
        <p className="text-muted-foreground">
          You’ve already submitted a curator application. Please wait while our professors review it.
        </p>
      </div>
    );
  }

  if (applicationStatus === "accepted") {
    return (
      <div className="p-6 text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">You’re Already a Curator</h2>
        <p className="text-muted-foreground">
          Congratulations! You’ve already been accepted as a curator. There’s no need to reapply.
        </p>
      </div>
    );
  }

  // Watch values for live counters
  const fullNameVal = form.watch("fullName");
  const eduVal = form.watch("educationalBackground");
  const certVal = form.watch("professionalCertifications");
  const expVal = form.watch("relevantExperience");
  const portVal = form.watch("portfolioWork");
  const motivVal = form.watch("motivation");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 hover:bg-muted"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  "Bachelor's degree in Art History, Museum Studies, or related field",
                  "Minimum 2 years of experience in art curation or museum work",
                  "Portfolio of previous curatorial work or exhibitions",
                  "Strong knowledge of historical periods and artistic movements",
                ].map((txt) => (
                  <div key={txt} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{txt}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-center mb-2">Review Period</h3>
                <p className="text-center text-2xl font-bold text-primary">5–7 Days</p>
              </div>
            </CardContent>
          </Card>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Application Form</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                    <div className="mb-4">
                      <FormLabel className="font-medium">Registered Email</FormLabel>
                      <p className="text-sm text-muted-foreground">{emailDisplay}</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Full Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSubmitting} maxLength={LIMITS.fullName} />
                          </FormControl>
                          <Counter value={fullNameVal} max={LIMITS.fullName} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Qualifications */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Qualifications</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="educationalBackground"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Educational Background <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} disabled={isSubmitting} maxLength={LIMITS.text} />
                            </FormControl>
                            <Counter value={eduVal} max={LIMITS.text} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="professionalCertifications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Certifications</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} disabled={isSubmitting} maxLength={LIMITS.text} />
                            </FormControl>
                            <Counter value={certVal} max={LIMITS.text} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="relevantExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Relevant Experience <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} disabled={isSubmitting} maxLength={LIMITS.text} />
                            </FormControl>
                            <Counter value={expVal} max={LIMITS.text} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="portfolioWork"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Portfolio/Previous Work <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} disabled={isSubmitting} maxLength={LIMITS.text} />
                            </FormControl>
                            <Counter value={portVal} max={LIMITS.text} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* CV Upload */}
                      <div>
                        <Label htmlFor="cv-upload">Upload CV/Resume (PDF/DOC/DOCX, up to {MAX_CV_MB}MB)</Label>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            id="cv-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleCvUpload}
                            className="hidden"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById("cv-upload")?.click()}
                            disabled={isSubmitting}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {cvFile ? cvFile.name : "Choose CV/Resume file"}
                          </Button>
                          {cvFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setCvFile(null)}
                              disabled={isSubmitting}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        {cvFile && (
                          <p className="text-sm text-muted-foreground mt-1">Selected: {cvFile.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Motivation */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Motivation</h3>
                    <FormField
                      control={form.control}
                      name="motivation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Why do you want to become a curator? <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} disabled={isSubmitting} maxLength={LIMITS.text} />
                          </FormControl>
                          <Counter value={motivVal} max={LIMITS.text} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearForm}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Clear Form
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting || bootLoading}>
                      {isSubmitting ? "Submitting…" : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
