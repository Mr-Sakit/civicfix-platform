import React, { createContext, useContext, useState, useEffect } from 'react';
import { civicfixApi } from '../services/api';
import type { AuthUser, BackendCategory, BackendIssue, BackendTeam } from '../services/api';

export interface Report {
  id: string;
  backendId?: number;
  title: string;
  description: string;
  location: string;
  category: 'ROADS' | 'UTILITIES' | 'SANITATION' | 'GRAFFITI';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Reported' | 'In Progress' | 'Resolved';
  date: string;
  image: string;
  assignedTo: string;
  reporter: string;
  lat: number;
  lng: number;
  isUrgent: boolean;
  notes?: string;
  imageName?: string;
}

interface AppContextType {
  reports: Report[];
  isApiConnected: boolean;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  userRole: 'citizen' | 'admin';
  activeTab: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectedReportId: string;
  addReport: (report: Omit<Report, 'id' | 'date'>) => Promise<void>;
  updateReport: (id: string, updates: Partial<Report>) => Promise<void>;
  setUserRole: (role: 'citizen' | 'admin') => void;
  setActiveTab: (tab: string) => void;
  setSelectedReportId: (id: string) => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
  wizardPhotos: string[];
  addWizardPhoto: (photoUrl: string) => void;
  removeWizardPhoto: (index: number) => void;
  clearWizard: () => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
}

const initialReports: Report[] = [
  {
    id: '#FIX-8842',
    title: 'Severe Pothole on Oak St.',
    description: 'Large pothole developed after the recent storm. Causing significant traffic slowing and safety concerns for cyclists.',
    location: 'Oakwood Drive & 5th Ave',
    category: 'ROADS',
    priority: 'High',
    status: 'In Progress',
    date: '2 mins ago',
    image: '',
    assignedTo: 'Roads Dept - North',
    reporter: 'Sarah J.',
    lat: 40.7128,
    lng: -74.0060,
    isUrgent: true,
    notes: 'Dispatch road crew immediately.'
  },
  {
    id: '#FIX-8841',
    title: 'Flickering Street Lamp',
    description: 'Main square lighting is non-functional. The streetlight outside unit 402 has been flickering all night, causing visibility issues.',
    location: 'North Park Plaza',
    category: 'UTILITIES',
    priority: 'Medium',
    status: 'Reported',
    date: '14 mins ago',
    image: '',
    assignedTo: 'Unassigned',
    reporter: 'Anonymous',
    lat: 40.7198,
    lng: -74.0010,
    isUrgent: false
  },
  {
    id: '#FIX-8839',
    title: 'Sanitation Overflow - Central Park',
    description: 'A wide municipal trash bin is overflowing on the busy sidewalk. Various bags and loose paper are scattered around the base.',
    location: '5th and Broadway',
    category: 'SANITATION',
    priority: 'Low',
    status: 'Reported',
    date: '42 mins ago',
    image: '',
    assignedTo: 'Unassigned',
    reporter: 'Officer Chen',
    lat: 40.7158,
    lng: -74.0090,
    isUrgent: false
  },
  {
    id: '#FIX-8835',
    title: 'Park Maintenance',
    description: 'Broken benches replaced and debris cleared. The central area is now fully accessible and safe for public use.',
    location: 'Sunset Memorial Park',
    category: 'SANITATION',
    priority: 'Low',
    status: 'Resolved',
    date: 'Yesterday',
    image: '',
    assignedTo: 'Sanitation Crew 2',
    reporter: 'Sarah J.',
    lat: 40.7258,
    lng: -73.9980,
    isUrgent: false
  },
  {
    id: '#FIX-8834',
    title: 'Hydrant Leakage',
    description: 'Constant leak detected at the base of hydrant #442. Reported as a significant water waste and potential freeze hazard.',
    location: 'Beacon Hill - East Wing',
    category: 'UTILITIES',
    priority: 'High',
    status: 'Reported',
    date: '5h ago',
    image: '',
    assignedTo: 'Unassigned',
    reporter: 'Citizen #0912',
    lat: 40.7100,
    lng: -74.0040,
    isUrgent: true
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

const routeByRoleAndTab: Record<'citizen' | 'admin', Record<string, string>> = {
  citizen: {
    home: '/',
    activity: '/activity',
    report: '/report',
  },
  admin: {
    dashboard: '/admin',
    map: '/admin/map',
  },
};

const getRouteState = (pathname: string): { role: 'citizen' | 'admin'; tab: string } => {
  if (pathname.startsWith('/admin/map')) {
    return { role: 'admin', tab: 'map' };
  }

  if (pathname.startsWith('/admin')) {
    return { role: 'admin', tab: 'dashboard' };
  }

  if (pathname.startsWith('/activity')) {
    return { role: 'citizen', tab: 'activity' };
  }

  if (pathname.startsWith('/report')) {
    return { role: 'citizen', tab: 'report' };
  }

  return { role: 'citizen', tab: 'home' };
};

const normalizeCategory = (category: string): Report['category'] => {
  const value = category.toLowerCase();

  if (value.includes('road') || value.includes('pothole')) return 'ROADS';
  if (value.includes('light') || value.includes('water') || value.includes('util')) return 'UTILITIES';
  if (value.includes('waste') || value.includes('trash') || value.includes('sanitation')) return 'SANITATION';
  return 'GRAFFITI';
};

const normalizePriority = (priority: string): Report['priority'] => {
  const value = priority.toLowerCase();

  if (value.includes('high') || value.includes('urgent')) return 'High';
  if (value.includes('low')) return 'Low';
  return 'Medium';
};

const normalizeStatus = (status: string): Report['status'] => {
  const value = status.toLowerCase();

  if (value.includes('resolved')) return 'Resolved';
  if (value.includes('assigned') || value.includes('progress') || value.includes('review')) return 'In Progress';
  return 'Reported';
};

const toBackendStatus = (status: Report['status']) => {
  if (status === 'Resolved') return 'resolved';
  if (status === 'In Progress') return 'assigned';
  return 'submitted';
};

const categoryHints: Record<Report['category'], string[]> = {
  ROADS: ['road', 'pothole'],
  UTILITIES: ['light', 'water', 'util'],
  SANITATION: ['waste', 'trash', 'sanitation'],
  GRAFFITI: ['safety', 'graffiti', 'vandal'],
};

const findCategoryId = (categories: BackendCategory[], category: Report['category']) => {
  const hints = categoryHints[category];
  return categories.find((item) => hints.some((hint) => item.name.toLowerCase().includes(hint)))?.id;
};

const findTeamId = (teams: BackendTeam[], assignedTo: string) => {
  const value = assignedTo.toLowerCase();

  if (value.includes('road')) return teams.find((team) => team.name.toLowerCase().includes('road'))?.id;
  if (value.includes('light')) return teams.find((team) => team.name.toLowerCase().includes('light'))?.id;
  if (value.includes('waste') || value.includes('sanitation')) {
    return teams.find((team) => team.name.toLowerCase().includes('waste'))?.id;
  }
  if (value.includes('water')) return teams.find((team) => team.name.toLowerCase().includes('water'))?.id;

  return teams.find((team) => team.name === assignedTo)?.id;
};

const formatRelativeDate = (createdAt?: string) => {
  if (!createdAt) return 'Recently';

  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 'Recently';

  const minutes = Math.max(1, Math.round((Date.now() - created) / 60000));
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const mapBackendIssue = (issue: BackendIssue): Report => ({
  id: `#FIX-${issue.id}`,
  backendId: issue.id,
  title: issue.title,
  description: issue.description,
  location: issue.address ?? 'Location not provided',
  category: normalizeCategory(issue.category),
  priority: normalizePriority(issue.priority),
  status: normalizeStatus(issue.status),
  date: formatRelativeDate(issue.created_at),
  image: issue.image_url ?? '',
  assignedTo: issue.assigned_team ?? 'Unassigned',
  reporter: 'CivicFix Resident',
  lat: Number(issue.latitude ?? 40.7128),
  lng: Number(issue.longitude ?? -74.0060),
  isUrgent: normalizePriority(issue.priority) === 'High',
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('civicfix_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('civicfix_reports');
    return saved ? JSON.parse(saved) : initialReports;
  });
  const initialRoute = getRouteState(window.location.pathname);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [teams, setTeams] = useState<BackendTeam[]>([]);
  const [userRole, setUserRoleState] = useState<'citizen' | 'admin'>(currentUser?.role ?? initialRoute.role);
  const [activeTab, setActiveTabState] = useState<string>(
    currentUser?.role === 'admin' ? 'dashboard' : initialRoute.tab
  );
  const [selectedReportId, setSelectedReportId] = useState<string>('#FIX-8842');

  // Wizard state for reporting an issue
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(45);

  useEffect(() => {
    localStorage.setItem('civicfix_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('civicfix_current_user', JSON.stringify(currentUser));
      setUserRoleState(currentUser.role);
      const targetTab = currentUser.role === 'admin' ? 'dashboard' : 'home';
      setActiveTabState((current) => (currentUser.role === 'admin' && !['dashboard', 'map'].includes(current) ? targetTab : current));
    } else {
      localStorage.removeItem('civicfix_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    const syncFromApi = async () => {
      try {
        const [apiIssues, apiCategories, apiTeams] = await Promise.all([
          civicfixApi.getIssues(),
          civicfixApi.getCategories(),
          civicfixApi.getTeams(),
        ]);

        setCategories(apiCategories);
        setTeams(apiTeams);
        setIsApiConnected(true);

        const mappedReports = apiIssues.map(mapBackendIssue);
        setReports(mappedReports);
        setSelectedReportId((current) => {
          if (mappedReports.some((report) => report.id === current)) return current;
          return mappedReports[0]?.id ?? '';
        });
      } catch {
        setIsApiConnected(false);
      }
    };

    void syncFromApi();
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const routeState = getRouteState(window.location.pathname);
      setUserRoleState(routeState.role);
      setActiveTabState(routeState.tab);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (role: 'citizen' | 'admin', tab: string) => {
    const nextPath = routeByRoleAndTab[role][tab] ?? '/';

    setUserRoleState(role);
    setActiveTabState(tab);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const login = async (email: string, password: string) => {
    const user = await civicfixApi.login({ email, password });
    setCurrentUser(user);
    navigateTo(user.role, user.role === 'admin' ? 'dashboard' : 'home');
  };

  const logout = () => {
    setCurrentUser(null);
    setUserRoleState('citizen');
    setActiveTabState('home');
    window.history.pushState({}, '', '/');
  };

  const addReport = async (reportData: Omit<Report, 'id' | 'date'>) => {
    const nextId = `#FIX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: Report = {
      ...reportData,
      id: nextId,
      date: 'Just now'
    };
    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(nextId);

    const categoryId = findCategoryId(categories, reportData.category);

    if (categoryId) {
      try {
        const createdIssue = await civicfixApi.createIssue({
          title: reportData.title,
          description: reportData.description,
          categoryId,
          address: reportData.location,
          latitude: reportData.lat,
          longitude: reportData.lng,
          imageDataUrl: reportData.image,
          imageName: reportData.imageName,
        });

        const mappedIssue = mapBackendIssue(createdIssue);
        setReports((prev) =>
          prev.map((report) => (report.id === nextId ? { ...mappedIssue, image: mappedIssue.image || reportData.image } : report))
        );
        setSelectedReportId(mappedIssue.id);
        setIsApiConnected(true);
      } catch {
        setIsApiConnected(false);
      }
    }
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    const currentReport = reports.find((report) => report.id === id);

    setReports((prev) =>
      prev.map((report) => (report.id === id ? { ...report, ...updates } : report))
    );

    if (!currentReport?.backendId) return;

    try {
      if (updates.assignedTo && updates.assignedTo !== currentReport.assignedTo) {
        const teamId = findTeamId(teams, updates.assignedTo);
        if (teamId) {
          await civicfixApi.assignIssue(currentReport.backendId, teamId);
        }
      }

      if (updates.status && updates.status !== currentReport.status) {
        await civicfixApi.updateIssueStatus(
          currentReport.backendId,
          toBackendStatus(updates.status),
          updates.notes
        );
      }

      setIsApiConnected(true);
    } catch {
      setIsApiConnected(false);
    }
  };

  const setUserRole = (role: 'citizen' | 'admin') => {
    navigateTo(role, role === 'citizen' ? 'home' : 'dashboard');
  };

  const setActiveTab = (tab: string) => {
    navigateTo(userRole, tab);
  };

  const addWizardPhoto = (photoUrl: string) => {
    setWizardPhotos((prev) => [...prev, photoUrl]);
  };

  const removeWizardPhoto = (index: number) => {
    setWizardPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const clearWizard = () => {
    setWizardStep(1);
    setWizardPhotos([]);
    setUploadProgress(0);
  };

  return (
    <AppContext.Provider
      value={{
        reports,
        isApiConnected,
        currentUser,
        isAuthenticated: Boolean(currentUser),
        userRole,
        activeTab,
        login,
        logout,
        selectedReportId,
        addReport,
        updateReport,
        setUserRole,
        setActiveTab,
        setSelectedReportId,
        wizardStep,
        setWizardStep,
        wizardPhotos,
        addWizardPhoto,
        removeWizardPhoto,
        clearWizard,
        uploadProgress,
        setUploadProgress
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
