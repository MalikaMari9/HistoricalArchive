import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SessionUser = {
  userId: number;
  username: string;
  email: string;
  role: 'visitor' | 'curator' | 'professor' | 'admin';
};

export function useAuthGuard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:8080/api/users/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (res.status === 401) {
          navigate('/signin', { replace: true });
          return;
        }
        if (res.status === 403) {
          navigate('/403', { replace: true });
          return;
        }
        if (!res.ok) {
          // Optional: handle other errors however you like
          navigate('/signin', { replace: true });
          return;
        }

        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        // Network error → treat as unauthenticated
        if (!cancelled) navigate('/signin', { replace: true });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return { user, ready };
}
