import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, User, Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";
import {
  checkUsername, checkEmail, registerUser,
} from "@/services/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileImage, setProfileImage] = useState<File | null>(null);

  const [usernameErr, setUsernameErr] = useState<string>("");
  const [emailErr, setEmailErr] = useState<string>("");

  // ---- debounced availability checks ----
  const uTimer = useRef<number | null>(null);
  const eTimer = useRef<number | null>(null);

  const normalizedUsername = useMemo(() => username.trim(), [username]);
  const normalizedEmail = useMemo(() => email.trim(), [email]);

  useEffect(() => {
    if (uTimer.current) window.clearTimeout(uTimer.current);
    if (!normalizedUsername) {
      setUsernameErr("");
      return;
    }
    uTimer.current = window.setTimeout(async () => {
      if (normalizedUsername.length < 3) {
        setUsernameErr("Username must be at least 3 characters.");
        return;
      }
      try {
        const taken = await checkUsername(normalizedUsername);
        setUsernameErr(taken ? "Username is already taken." : "");
      } catch {
        // silent; don't block typing if backend is down
      }
    }, 300);
    return () => {
      if (uTimer.current) window.clearTimeout(uTimer.current);
    };
  }, [normalizedUsername]);

  useEffect(() => {
    if (eTimer.current) window.clearTimeout(eTimer.current);
    if (!normalizedEmail) {
      setEmailErr("");
      return;
    }
    eTimer.current = window.setTimeout(async () => {
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        setEmailErr("Invalid email format.");
        return;
      }
      try {
        const taken = await checkEmail(normalizedEmail);
        setEmailErr(taken ? "Email is already in use." : "");
      } catch {
        // silent
      }
    }, 300);
    return () => {
      if (eTimer.current) window.clearTimeout(eTimer.current);
    };
  }, [normalizedEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // final client-side checks
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailErr("Invalid email format.");
      return;
    }
    if (password !== confirm) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Error", description: "Please agree to the terms and conditions.", variant: "destructive" });
      return;
    }
    if (usernameErr || emailErr) {
      toast({ title: "Error", description: "Please fix the errors before submitting.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Build payload:
      // - If image present -> multipart
      // - Else -> JSON (API helper handles both)
      await registerUser({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        profileImage,
      });

      toast({
        title: "Account Created!",
        description: "Welcome to Historical Archive. Please sign in.",
      });
      navigate("/signin");
    } catch (err: any) {
      const msg =
        err?.response?.data && typeof err.response.data === "string"
          ? err.response.data
          : err?.response?.data?.message ||
            "Could not register right now. Please try again.";
      toast({ title: "Registration Failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center py-12 px-4">
      {/* Back Arrow */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <div className="w-full max-w-md space-y-8">
        {/* Logo + Header */}
        <div className="text-center">
          <img
            src={logo}
            alt="Historical Archive"
            className="mx-auto h-16 w-auto rounded-lg mb-4"
          />
          <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
          <p className="text-muted-foreground mt-2">
            Join our community of art enthusiasts
          </p>
        </div>

        {/* Form */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create your Historical Archive account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Profile Image */}
              <div className="space-y-2">
                <Label htmlFor="profile-picture">Profile Picture (Optional)</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img
                        src={URL.createObjectURL(profileImage)}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("profile-picture")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <input
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileImage(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className={`pl-10 ${usernameErr ? "border-red-500" : ""}`}
                    autoComplete="username"
                    required
                  />
                </div>
                {usernameErr && <p className="text-red-500 text-xs mt-1">{usernameErr}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`pl-10 ${emailErr ? "border-red-500" : ""}`}
                    autoComplete="email"
                    required
                  />
                </div>
                {emailErr && <p className="text-red-500 text-xs mt-1">{emailErr}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {/* Confirm */}
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(Boolean(c))} />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || !!usernameErr || !!emailErr}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6">
              <Separator />
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/signin" className="font-medium text-primary hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
