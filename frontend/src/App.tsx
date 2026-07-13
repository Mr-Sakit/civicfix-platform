import React from 'react';
import { useApp } from './context/AppContext';
import TopAppBar from './components/TopAppBar';
import SideNavBar from './components/SideNavBar';
import BottomNavBar from './components/BottomNavBar';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ActivityFeed from './pages/citizen/ActivityFeed';
import ReportIssueWizard from './pages/citizen/ReportIssueWizard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMapView from './pages/admin/AdminMapView';
import LoginPage from './pages/LoginPage';

export const AppContent: React.FC = () => {
  const { isAuthenticated, userRole, activeTab } = useApp();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCitizenPage = () => {
    switch (activeTab) {
      case 'home':
        return <CitizenDashboard />;
      case 'activity':
        return <ActivityFeed />;
      case 'report':
        return <ReportIssueWizard />;
      default:
        return <CitizenDashboard />;
    }
  };

  const renderAdminPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'map':
        return <AdminMapView />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Top Navbar Header */}
      <TopAppBar />

      {/* Main Layout Container */}
      <div className="flex-grow flex pt-16">
        {userRole === 'admin' ? (
          <>
            {/* Sidebar nav for administrator panels */}
            <SideNavBar />
            
            {/* Margined layout for admin pages */}
            <main className="flex-grow ml-0 md:ml-64 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
              {renderAdminPage()}
            </main>
          </>
        ) : (
          /* Simple full-width layout for citizen view */
          <main className="flex-grow w-full overflow-y-auto">
            {renderCitizenPage()}
          </main>
        )}
      </div>

      {/* Responsive mobile BottomNavBar for citizens */}
      {userRole === 'citizen' && <BottomNavBar />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
