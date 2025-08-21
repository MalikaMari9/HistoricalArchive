import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => setSidebarOpen(true);
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onMenuClick={handleMenuClick} />

      <main className="relative">
        <Outlet />
      </main>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        // Sidebar should also fetch session internally (if needed)
        // Or receive it from Navbar context if you decide to unify state later
      />
    </div>
  );
};
