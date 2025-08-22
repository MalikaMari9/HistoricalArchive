import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/signin", { replace: true });
    } else if (user.status === "RESTRICTED") {
      navigate("/403", { replace: true });
    }
  }, [user, loading, navigate]);

  return { user, ready: !loading };
}
