import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutProps {
  userRole?: 'visitor' | 'curator' | 'professor' | 'admin';
  isAuthenticated?: boolean;
}

export const Layout = ({ userRole = 'visitor', isAuthenticated = false }: LayoutProps) => {
  const location = useLocation();
  
  // Hide navbar and footer for auth forms and other specific pages
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
      {!hideNavAndFooter && (
        <Navbar 
          isAuthenticated={isAuthenticated}
          userRole={userRole}
        />
      )}
      
      <main className="relative">
        <Outlet />
      </main>

      {!hideNavAndFooter && <Footer />}
    </div>
  );
};