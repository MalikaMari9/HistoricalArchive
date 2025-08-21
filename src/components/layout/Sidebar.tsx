import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Edit3, Lock, Heart, LogOut, Users,
  CheckCircle, BarChart, Upload, GraduationCap, X, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogoutDialog } from '@/components/LogoutDialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AUTH_EVENT = 'auth:changed';

type Role = 'visitor' | 'curator' | 'professor' | 'admin';

interface UserProfile {
  username: string;
  email: string;
  profilePicture?: string;
  fullName?: string;
  role: Role;
}

export const Sidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { toast } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole: Role = user?.role || 'visitor';
  const isAuthenticated = !!user;

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/profile', {
          credentials: 'include',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-store' },
        });
        if (!res.ok) throw new Error();

        const data = await res.json();

        // normalize profile picture URL if provided
        const fullProfile = { ...data };
        if (data.profilePicture) {
          fullProfile.profilePicture = `http://localhost:8080${data.profilePicture}`;
        }

        setUser(fullProfile);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // initial fetch
    fetchProfile();

    // react to auth changes (login/logout elsewhere)
    const handler = () => fetchProfile();
    window.addEventListener(AUTH_EVENT, handler);

    return () => {
      controller.abort();
      window.removeEventListener(AUTH_EVENT, handler);
    };
  }, []);

  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleItemClick = () => onClose();

  if (!isVisible || loading) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-background border-l shadow-elegant z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onDoubleClick={onClose}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-medium text-foreground">Menu</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Account Info */}
          {isAuthenticated && (
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  {user?.profilePicture ? (
                    <AvatarImage
                      src={user.profilePicture}
                      alt={user.fullName || user.username || "User"}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium text-foreground text-lg">{user?.username || 'User'}</p>
                  <Link
                    to={
                      userRole === 'admin' ? '/admin'
                      : userRole === 'professor' ? '/professor'
                      : userRole === 'curator' ? '/curator'
                      : '/visitor'
                    }
                    onClick={handleItemClick}
                    className="text-muted-foreground capitalize hover:text-primary transition-colors underline-offset-2 hover:underline"
                  >
                    {userRole}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {isAuthenticated && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 space-y-6">
                {/* Account Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">ACCOUNT</h3>
                  <div className="space-y-1">
                    <Link to="/profile" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><User className="icon" /><span>View Profile</span></Link>
                    <Link to="/profile/edit" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Edit3 className="icon" /><span>Edit Profile</span></Link>
                    <Link to="/change-password" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Lock className="icon" /><span>Change Password</span></Link>
                    {userRole !== 'admin' && (
                      <Link to="/bookmarks" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Heart className="icon" /><span>Bookmark</span></Link>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Role-specific */}
                {userRole === 'visitor' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">VISITOR FUNCTIONS</h3>
                    <Link to="/upgrade-curator" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><GraduationCap className="icon" /><span>Upgrade to Curator</span></Link>
                  </div>
                )}

                {userRole === 'curator' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">CURATOR</h3>
                    <Link to="/curator/upload" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Upload className="icon" /><span>Upload Art</span></Link>
                    <Link to="/curator/artworks" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Upload className="icon" /><span>Upload History</span></Link>
                  </div>
                )}

                {userRole === 'professor' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">PROFESSOR</h3>
                    <Link to="/professor/review" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><CheckCircle className="icon" /><span>Review Arts</span></Link>
                    <Link to="/professor/curator-applications" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><CheckCircle className="icon" /><span>Review Curators</span></Link>
                  </div>
                )}

                {userRole === 'admin' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">ADMIN</h3>
                    <Link to="/admin/users" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Users className="icon" /><span>Manage Users</span></Link>
                    <Link to="/admin/artworks" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><CheckCircle className="icon" /><span>Manage Artworks</span></Link>
                    <Link to="/admin/announcements" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><Image className="icon" /><span>Manage Announcement</span></Link>
                    <Link to="/admin/reports" onClick={handleItemClick} className="flex items-center space-x-3 px-0 py-3 text-foreground hover:text-primary transition-colors"><BarChart className="icon" /><span>Reports</span></Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logout */}
          {isAuthenticated && (
            <div className="mt-auto">
              <Separator />
              <div className="px-6 py-4">
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="flex items-center space-x-3 px-0 py-3 text-destructive hover:text-destructive/80 transition-colors w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          {/* Guest CTA */}
          {!isAuthenticated && (
            <>
              <Separator />
              <div className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">Sign in to access more features</p>
                <div className="space-y-2">
                  <Button className="w-full" asChild><Link to="/signin" onClick={handleItemClick}>Sign In</Link></Button>
                  <Button variant="outline" className="w-full" asChild><Link to="/signup" onClick={handleItemClick}>Sign Up</Link></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logout Dialog */}
      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={async () => {
          try {
            await fetch('http://localhost:8080/api/logout', {
              method: 'POST',
              credentials: 'include',
            });
            // Broadcast to Navbar/Sidebar/etc.
            window.dispatchEvent(new Event(AUTH_EVENT));
            setUser(null);

            toast({ title: 'Logged out', description: 'You have been signed out successfully.' });
            localStorage.clear();
            sessionStorage.clear();
            setLogoutDialogOpen(false);
            onClose();
            navigate('/signin');
          } catch (error) {
            toast({ title: 'Logout failed', description: 'An error occurred while logging out.', variant: 'destructive' });
            console.error('Logout error:', error);
          }
        }}
      />
    </>
  );
};
