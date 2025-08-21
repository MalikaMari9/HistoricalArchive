import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";
import { getMe, login } from "@/services/api";

type Role = "admin" | "professor" | "curator" | "visitor";

const ROLE_ROUTES: Record<Role, string> = {
  admin: "/admin",
  professor: "/professor",
  curator: "/curator",
  visitor: "/visitor",
};

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "";
  }, [location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // rudimentary caps lock detection for password usability
      if (e.getModifierState) setCapsOn(e.getModifierState("CapsLock"));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const safeRouteByRole = (role: unknown): string => {
    const r = (String(role || "visitor") as Role).toLowerCase() as Role;
    return ROLE_ROUTES[r] ?? ROLE_ROUTES.visitor;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      await login({ username: formData.username, password: formData.password });

      // fetch current session user
      const me = await getMe();

      // let any global listeners refresh (e.g., navbar auth)
      window.dispatchEvent(new Event("auth:changed"));

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      const roleRoute = safeRouteByRole(me?.role);
      // honor ?next= if provided (and not pointing back to /signin)
      const dest =
        nextPath && !/\/signin$/i.test(nextPath) ? nextPath : roleRoute;

      // tiny delay so toast is visible before route change
      setTimeout(() => navigate(dest, { replace: true }), 500);
    } catch (err: any) {
      // normalize error messages
      let description = "An unknown error occurred.";
      if (err?.response) {
        const status = err.response.status;
        if (typeof err.response.data === "string") description = err.response.data;
        else if (err.response.data?.message) description = err.response.data.message;
        else if (status === 401) description = "Invalid credentials.";
        else if (status === 403) description = "You don't have access to this resource.";
        else if (status >= 500) description = "Server error. Please try again later.";
      } else if (err?.message === "Network Error") {
        description = "Network error. Check your connection.";
      }

      toast({
        title: "Login Failed",
        description,
        variant: "destructive",
      });
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
        {/* Logo and Header */}
        <div className="text-center">
          <img
            src={logo}
            alt="Historical Archive"
            className="mx-auto h-16 w-auto rounded-lg mb-4"
          />
          <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
          <p className="text-muted-foreground mt-2">
            Sign in to your Historical Archive account
          </p>
        </div>

        {/* Sign In Form */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-6"
              autoComplete="on"
            >
              {/* Username or Email */}
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username or email"
                    className="pl-10"
                    autoComplete="username"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {capsOn && (
                  <p className="text-xs text-amber-600">Caps Lock is on</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* OAuth */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <a
                  href="http://localhost:8080/oauth2/authorization/google"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full" disabled={isLoading}>
                    Google
                  </Button>
                </a>
                <Button variant="outline" className="w-full" disabled>
                  Apple
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6">
              <Separator />
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Sign up here
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
