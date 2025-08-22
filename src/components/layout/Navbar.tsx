import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, User, Heart, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.jpg';
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  username: string;
  email: string;
  role: 'visitor' | 'curator' | 'professor' | 'admin';
  profilePicture?: string;
  fullName?: string;
}

interface NavbarProps {
  onMenuClick?: () => void;
}

const AUTH_EVENT = 'auth:changed';

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const location = useLocation();
const { user, isAuthenticated, loading } = useAuth();
const [imgOk, setImgOk] = useState(true);



  const isActive = (path: string) => location.pathname === path;

  function toAbsoluteMediaUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `http://localhost:8080${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}


  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-soft">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Historical Archive" className="h-10 w-auto rounded-lg" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-primary">Historical Archive</h1>
            <p className="text-xs text-muted-foreground">Art Gallery</p>
          </div>
        </Link>

        {/* Public Nav */}
        {!isAuthenticated && (
          <div className="hidden md:flex items-center space-x-8">
            {['home', 'gallery', 'about', 'contact'].map((page) => (
              <Link
                key={page}
                to={`/${page}`}
                className={`font-medium transition-colors hover:text-primary ${
                  isActive(`/${page}`) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </Link>
            ))}
          </div>
        )}

        {/* Search + Bell */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="ghost" size="sm" className="relative">
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
              </Link>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs"></span>
            </Button>
          </div>
        )}

        {/* Right-side actions */}
        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <div className="hidden sm:flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {(user?.role === 'visitor' || user?.role === 'curator') && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/watched-later">
                    <Heart className="h-4 w-4" />
                  </Link>
                </Button>
              )}

              <Button variant="ghost" className="p-1">
<Avatar className="h-8 w-8">
  {imgOk && user?.profilePicture ? (
    <AvatarImage
      src={toAbsoluteMediaUrl(user.profilePicture)}
      alt={user.username ?? "User"}
      className="object-cover"
      onError={() => setImgOk(false)}
    />
  ) : (
    <AvatarFallback className="bg-muted">
      <User className="h-4 w-4" />
    </AvatarFallback>
  )}
</Avatar>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="flex items-center space-x-1"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};