// src/hooks/useCurrentUser.ts
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface CurrentUser {
  userId: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
}

export const useCurrentUser = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    userId: null,
    username: null,
    email: null,
    role: null
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/users/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCurrentUser({
            userId: data.userId,
            username: data.username,
            email: data.email,
            role: data.role
          });
        } else {
          setCurrentUser({
            userId: null,
            username: null,
            email: null,
            role: null
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [toast]);

  return { currentUser, loading };
};