import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useAuth } from '@/hooks/useAuth';

export const DashboardLayout = () => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Optional: render nothing while session is still loading
  if (loading) return null;

  // Pages where we hide navbar/footer (auth forms, etc.)
  const hideNavAndFooter = [
    '/signin',
    '/signup',
    '/forgot-password',
    '/change-password',
    '/profile',
    '/profile/edit',
    '/upgrade-curator',
    '/visitor'
  ].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {!hideNavAndFooter && <Navbar />}

      <main className="relative">
        <Outlet />
      </main>

      {!hideNavAndFooter && <Footer />}
    </div>
  );
};
