// src/hooks/useAuth.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Match your session DTO
export interface User {
  userId: number;
  username: string;
  email: string;
  role: "visitor" | "curator" | "professor" | "admin";
  status: "ACTIVE" | "RESTRICTED"; // NEW
  profilePicture?: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData?: User) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch session user on first load
 useEffect(() => {

const fetchUser = async () => {
  try {
    const res = await fetch("http://localhost:8080/api/users/me", {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data);
    } else {
      setUser(null);
    }
  } catch {
    setUser(null);
  } finally {
    setLoading(false);
  }
};

fetchUser();

}, []);


  const login = async (userData?: User) => {
    if (userData) {
      setUser(userData); // manual override if passed
    } else {
      try {
        const res = await fetch("http://localhost:8080/api/users/me", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        setUser(null);
      }
    }
  };

  const logout = async () => {
    try {
      await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
