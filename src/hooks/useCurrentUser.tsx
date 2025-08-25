// src/hooks/useCurrentUser.ts
import { useAuth } from "./useAuth";

export const useCurrentUser = () => {
  const { user, loading } = useAuth();

  return {
    currentUser: user
      ? {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
        }
      : {
          userId: null,
          username: null,
          email: null,
          role: null,
        },
    loading,
  };
};
