// --- Lib Imports ---
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// --- UI + Context ---
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// --- Layouts ---
import { DashboardLayout } from "./components/layout/DashboardLayout";

// --- Pages: General ---
import About from "./pages/About";
import Bookmarks from "./pages/Bookmarks";
import Contact from "./pages/Contact";
import Gallery from "./pages/Gallery";
import Home from "./pages/Home";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// --- Pages: Auth ---
import ChangePassword from "./pages/auth/ChangePassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

// --- Pages: Profile ---
import EditProfile from "./pages/profile/EditProfile";
import ViewProfile from "./pages/profile/ViewProfile";

// --- Pages: Curator ---
import { EditArtwork } from "./pages/curator/EditArtwork";
import { ManageArtworks } from "./pages/curator/ManageArtworks";
import UploadArt from "./pages/curator/UploadArt";
import CuratorDashboard from "./pages/dashboard/CuratorDashboard";
import UpgradeCurator from "./pages/UpgradeCurator";
import WatchedLater from "./pages/WatchedLater";

// --- Pages: Admin ---
import MakeAnnouncement from "./pages/admin/MakeAnnoucement";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import ManageUsers from "./pages/admin/ManageUsers";
// import ReviewArts from "./pages/admin/ReviewArts";
import { ManageArtworks as AdminManageArtworks } from "./pages/admin/AdminManageArtworks";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// --- Pages: Professor ---
import ProfessorDashboard from "./pages/dashboard/ProfessorDashboard";
import CuratorApplications from "./pages/professor/CuratorApplication";
import { ReviewArts as ProfessorReviewArts } from "./pages/professor/ReviewArts";

//import ReviewCurator from "./pages/professor/ReviewCurator";

// --- Pages: Artifact ---
import { AuthProvider } from "@/hooks/useAuth";
import ArtworkDetail from "./pages/artifacts/ArtworkDetail";
import MapGallery from "./pages/MapGallery";

// --- Axios Config ---
axios.defaults.withCredentials = true;

// --- React Query Client ---

//--- Notification ---
import { Notifications } from "./pages/Notifications";

const queryClient = new QueryClient();

axios.defaults.withCredentials = true;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Main Website Routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Index />} />
              <Route path="home" element={<Home />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="map-gallery" element={<MapGallery />} />
              <Route path="artwork/:_id" element={<ArtworkDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="signin" element={<SignIn />} />
              <Route path="signup" element={<SignUp />} />

              <Route path="/bookmarks" element={<Bookmarks />} />

              <Route path="change-password" element={<ChangePassword />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="upgrade-curator" element={<UpgradeCurator />} />

              <Route path="visitor" element={<Gallery />} />
            </Route>

            <Route path="/profile" element={<DashboardLayout />}>
              <Route index element={<ViewProfile />} />
              <Route path="edit" element={<EditProfile />} />
              <Route path="watched-later" element={<WatchedLater />} />
            </Route>

            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="artworks" element={<AdminManageArtworks />} />
              {/* Review arts removed */}
              <Route path="announcements" element={<ManageAnnouncements />} />
              <Route path="announcements/new" element={<MakeAnnouncement />} />
            </Route>
            {/* Curator Dashboard Routes */}
            <Route path="/curator" element={<DashboardLayout />}>
              <Route index element={<CuratorDashboard />} />
              <Route path="upload" element={<UploadArt />} />
              <Route path="artworks" element={<ManageArtworks />} />
            </Route>
            <Route
              path="/curator/artworks/edit/:id"
              element={<EditArtwork />}
            />

            {/* Notifications Route - Outside main Layout to avoid navbar duplication */}
            <Route path="/notifications" element={<Notifications />} />

            {/* Professor Dashboard Routes */}
            <Route path="/professor" element={<DashboardLayout />}>
              <Route index element={<ProfessorDashboard />} />
              <Route path="review" element={<ProfessorReviewArts />} />

              <Route
                path="/professor/review-artifacts/:status/:submissionId"
                element={<ProfessorReviewArts />}
              />
              <Route
                path="curator-applications"
                element={<CuratorApplications />}
              />
              <Route
                path="/professor/curators/review/:id"
                element={<CuratorApplications />}
              />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
