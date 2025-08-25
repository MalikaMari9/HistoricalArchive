import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth check

    if (!user) {
      // Only redirect AFTER loading completes
      navigate("/signin", { replace: true });
    } else if (user.status === "RESTRICTED") {
      navigate("/403", { replace: true });
    }
  }, [user, loading, navigate]);

  return {
    user,
    ready: !loading && !!user,
  };
}
