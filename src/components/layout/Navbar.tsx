import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, User, Heart, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.jpg';
import { useAuth } from "@/hooks/useAuth";
import { listNotifications } from "@/services/api";

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [imgOk, setImgOk] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!isAuthenticated) return;
    const ac = new AbortController();

    listNotifications({ signal: ac.signal, unreadOnly: true })
      .then((notis) => {
        setUnreadCount(notis?.length || 0);
      })
      .catch((err) => {
        if (err?.name !== "CanceledError") console.error("Failed to load noti count", err);
      });

    return () => ac.abort();
  }, [isAuthenticated]);

  const toAbsoluteMediaUrl = (pathOrUrl?: string | null) => {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `http://localhost:8080${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-soft">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Historical Archive" className="h-10 w-auto rounded-lg" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-primary">Historical Archive</h1>
            <p className="text-xs text-muted-foreground">Art Gallery</p>
          </div>
        </Link>

        {/* Center search bar (all users) */}
        <div className="flex-1 px-2 md:px-6">
          <div className="relative w-full max-w-xs md:max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search artworks, artists..."
              className="pl-10 pr-10 py-1.5 md:py-2 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Link to="/gallery">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
            </Link>
          </div>
        </div>

        {/* Right-side content */}
        <div className="flex items-center space-x-3">
          {!isAuthenticated ? (
            <>
              {/* Public nav (desktop only) */}
              <div className="hidden md:flex items-center space-x-6">
                {['gallery', 'about', 'contact'].map((page) => (
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

              {/* Sign in / up buttons */}
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Notification bell */}
              <Link to="/notifications" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2.5 -right-3.5 min-w-[16px] h-[16px] px-1 bg-destructive text-white text-[10px] leading-[16px] rounded-full text-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Watched Later (curator/visitor) */}
              {(user?.role === 'visitor' || user?.role === 'curator') && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/watched-later">
                    <Heart className="h-4 w-4" />
                  </Link>
                </Button>
              )}

              {/* Avatar */}
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
            </>
          )}

          {/* Mobile menu (authenticated only) */}
          {onMenuClick && isAuthenticated && (
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
