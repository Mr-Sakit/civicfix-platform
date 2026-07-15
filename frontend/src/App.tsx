import React, { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ActivityFeed from './pages/citizen/ActivityFeed';
import ReportIssueWizard from './pages/citizen/ReportIssueWizard';
import ReportDetail from './pages/citizen/ReportDetail';
import CitizenMapView from './pages/citizen/CitizenMapView';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMapView from './pages/admin/AdminMapView';
import CrewDashboard from './pages/crew/CrewDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';
import { isNativeApp } from './services/nativeCamera';

const useUnauthPath = () => {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  };

  return { path, navigate };
};

export const AppContent: React.FC = () => {
  const { isAuthenticated, userRole, activeTab } = useApp();
  const { path, navigate } = useUnauthPath();

  if (!isAuthenticated) {
    // The app has no landing page — it always opens straight to sign in.
    if (isNativeApp()) {
      if (path.startsWith('/signup')) return <SignupPage onNavigate={navigate} />;
      return <LoginPage onNavigate={navigate} />;
    }
    if (path.startsWith('/signup')) return <SignupPage onNavigate={navigate} />;
    if (path.startsWith('/login')) return <LoginPage onNavigate={navigate} />;
    return <LandingPage onNavigate={navigate} />;
  }

  const renderCitizenPage = () => {
    switch (activeTab) {
      case 'home':
        return <CitizenDashboard />;
      case 'activity':
        return <ActivityFeed />;
      case 'report':
        return <ReportIssueWizard />;
      case 'reportDetail':
        return <ReportDetail />;
      case 'map':
        return <CitizenMapView />;
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
          <main className="flex-grow w-full flex flex-col h-[calc(100vh_-_4rem)] overflow-y-auto">
            {renderAdminPage()}
          </main>
        ) : userRole === 'crew' ? (
          <main className="flex-grow w-full flex flex-col h-[calc(100vh_-_4rem)] overflow-y-auto">
            <CrewDashboard />
          </main>
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
