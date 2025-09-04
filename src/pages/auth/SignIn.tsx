import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";
import { getMe, login as loginAPI } from "@/services/api"; // ✅ rename to avoid conflict
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

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
  const { login: setUserContext } = useAuth(); // ✅ clear naming

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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      // ✅ Step 1: Authenticate with backend
      await loginAPI({
        username: formData.username,
        password: formData.password,
      });

      // ✅ Step 2: Fetch user info
      const userInfo = await getMe();

      // ✅ Step 3: Set in context
      await setUserContext(userInfo);

      const userRole = (userInfo?.role || "visitor") as Role;
      const roleRoute = safeRouteByRole(userRole);

      toast({
        title: "Welcome back!",
        description: `Logged in as ${userRole}`,
      });

      const dest = nextPath && !/\/signin$/i.test(nextPath) ? nextPath : roleRoute;

      setTimeout(() => {
        navigate(dest, { replace: true });
      }, 500);
    } catch (err: any) {
      let description = "An unknown error occurred.";
      if (err?.response) {
        const status = err.response.status;
        if (typeof err.response.data === "string") description = err.response.data;
        else if (err.response.data?.message) description = err.response.data.message;
        else if (status === 401) description = "Invalid credentials.";
        else if (status === 403) description = "Access forbidden.";
        else if (status >= 500) description = "Server error. Try again later.";
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

            

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* OAuth */}


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
