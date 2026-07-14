import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiError, civicfixApi } from '../services/api';
import type { AuthUser, BackendCategory, BackendIssue, BackendTeam, DuplicateIssueResponse, NotificationItem } from '../services/api';

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
  watcherCount?: number;
  aiSummary?: string;
  aiPhotoMatch?: boolean | null;
}

export type AddReportResult =
  | { status: 'created'; report: Report }
  | { status: 'duplicate'; existingReport: Report; watcherCount: number; distanceMeters: number }
  | { status: 'mismatch'; message: string }
  | { status: 'error'; message: string };

const isDuplicateIssueResponse = (value: BackendIssue | DuplicateIssueResponse): value is DuplicateIssueResponse => {
  return 'duplicate' in value && value.duplicate === true;
};

interface AppContextType {
  reports: Report[];
  isApiConnected: boolean;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  userRole: 'citizen' | 'admin';
  activeTab: string;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectedReportId: string;
  addReport: (report: Omit<Report, 'id' | 'date'>) => Promise<AddReportResult>;
  updateReport: (id: string, updates: Partial<Report>) => Promise<void>;
  watchReport: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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

const initialReports: Report[] = [];

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

const defaultTabByRole: Record<'citizen' | 'admin', string> = {
  citizen: 'home',
  admin: 'dashboard',
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

const getProtectedRouteState = (
  role: 'citizen' | 'admin',
  pathname: string
): { role: 'citizen' | 'admin'; tab: string; path: string } => {
  const routeState = getRouteState(pathname);

  if (routeState.role !== role) {
    const tab = defaultTabByRole[role];
    return {
      role,
      tab,
      path: routeByRoleAndTab[role][tab],
    };
  }

  const tab = routeByRoleAndTab[role][routeState.tab] ? routeState.tab : defaultTabByRole[role];

  return {
    role,
    tab,
    path: routeByRoleAndTab[role][tab],
  };
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
  watcherCount: issue.watcher_count ?? 0,
  aiSummary: issue.ai_summary ?? undefined,
  aiPhotoMatch: issue.ai_photo_match ?? null,
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userRole, setUserRoleState] = useState<'citizen' | 'admin'>(currentUser?.role ?? 'citizen');
  const [activeTab, setActiveTabState] = useState<string>(
    currentUser ? getProtectedRouteState(currentUser.role, window.location.pathname).tab : initialRoute.tab
  );
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Wizard state for reporting an issue
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(45);
  const [watcherKey] = useState(() => {
    const stored = localStorage.getItem('civicfix_watcher_key');
    if (stored) return stored;
    const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem('civicfix_watcher_key', next);
    return next;
  });

  useEffect(() => {
    localStorage.setItem('civicfix_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('civicfix_current_user', JSON.stringify(currentUser));
      const protectedRoute = getProtectedRouteState(currentUser.role, window.location.pathname);
      setUserRoleState(currentUser.role);
      setActiveTabState(protectedRoute.tab);

      if (window.location.pathname !== protectedRoute.path) {
        window.history.replaceState({}, '', protectedRoute.path);
      }
    } else {
      localStorage.removeItem('civicfix_current_user');
      setUserRoleState('citizen');
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

  const refreshNotifications = async () => {
    if (!currentUser) return;

    try {
      const result = await civicfixApi.getNotifications({
        userId: currentUser.id,
        role: currentUser.role
      });
      setNotifications(result.notifications);
      setUnreadNotificationCount(result.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadNotificationCount(0);
    }
  };

  useEffect(() => {
    void refreshNotifications();
  }, [currentUser]);

  useEffect(() => {
    const onPopState = () => {
      if (!currentUser) {
        const routeState = getRouteState(window.location.pathname);
        setUserRoleState('citizen');
        setActiveTabState(routeState.tab);
        return;
      }

      const protectedRoute = getProtectedRouteState(currentUser.role, window.location.pathname);
      setUserRoleState(currentUser.role);
      setActiveTabState(protectedRoute.tab);

      if (window.location.pathname !== protectedRoute.path) {
        window.history.replaceState({}, '', protectedRoute.path);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser]);

  const navigateTo = (role: 'citizen' | 'admin', tab: string) => {
    const effectiveRole = currentUser?.role ?? role;
    const safeTab = routeByRoleAndTab[effectiveRole][tab] ? tab : defaultTabByRole[effectiveRole];
    const nextPath = routeByRoleAndTab[effectiveRole][safeTab];

    setUserRoleState(effectiveRole);
    setActiveTabState(safeTab);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const login = async (email: string, password: string) => {
    const user = await civicfixApi.login({ email, password });
    setCurrentUser(user);
    navigateTo(user.role, user.role === 'admin' ? 'dashboard' : 'home');
    setTimeout(() => void refreshNotifications(), 0);
  };

  const logout = () => {
    setCurrentUser(null);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setUserRoleState('citizen');
    setActiveTabState('home');
    window.history.replaceState({}, '', '/');
  };

  const addReport = async (reportData: Omit<Report, 'id' | 'date'>): Promise<AddReportResult> => {
    const nextId = `#FIX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: Report = {
      ...reportData,
      id: nextId,
      date: 'Just now'
    };
    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(nextId);

    const categoryId = findCategoryId(categories, reportData.category);

    if (!categoryId) {
      return { status: 'error', message: 'Could not map the selected category to the backend.' };
    }

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
        userId: currentUser?.id,
        watcherKey,
      });

      if (isDuplicateIssueResponse(createdIssue)) {
        const existingReport = mapBackendIssue(createdIssue.issue);
        setReports((prev) => prev.filter((report) => report.id !== nextId));
        setSelectedReportId(existingReport.id);
        setIsApiConnected(true);
        await refreshNotifications();
        return {
          status: 'duplicate',
          existingReport,
          watcherCount: createdIssue.watcherCount,
          distanceMeters: createdIssue.distanceMeters,
        };
      }

      const mappedIssue = mapBackendIssue(createdIssue);
      setReports((prev) =>
        prev.map((report) => (report.id === nextId ? { ...mappedIssue, image: mappedIssue.image || reportData.image } : report))
      );
      setSelectedReportId(mappedIssue.id);
      setIsApiConnected(true);
      await refreshNotifications();
      return { status: 'created', report: mappedIssue };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.body && typeof error.body === 'object' && 'data' in error.body) {
        const duplicate = (error.body as { data?: DuplicateIssueResponse }).data;
        if (duplicate?.duplicate) {
          const existingReport = mapBackendIssue(duplicate.issue);
          setReports((prev) => prev.filter((report) => report.id !== nextId));
          setSelectedReportId(existingReport.id);
          setIsApiConnected(true);
          await refreshNotifications();
          return {
            status: 'duplicate',
            existingReport,
            watcherCount: duplicate.watcherCount,
            distanceMeters: duplicate.distanceMeters,
          };
        }
      }

      if (error instanceof ApiError && error.status === 422) {
        const body = error.body as { message?: string; data?: { reason?: string } };
        setReports((prev) => prev.filter((report) => report.id !== nextId));
        return {
          status: 'mismatch',
          message: body.data?.reason
            ? `${body.message ?? 'The uploaded photo does not match the report.'} ${body.data.reason}`
            : body.message ?? 'The uploaded photo does not appear to match this report.',
        };
      }

      setIsApiConnected(false);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit report.'
      };
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

  const setActiveTab = (tab: string) => {
    navigateTo(currentUser?.role ?? userRole, tab);
  };

  const watchReport = async (id: string) => {
    const report = reports.find((item) => item.id === id);
    if (!report?.backendId) return;

    const result = await civicfixApi.watchIssue(report.backendId, {
      userId: currentUser?.id,
      watcherKey,
    });

    setReports((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, watcherCount: result.watcherCount } : item
      )
    );
    await refreshNotifications();
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    await civicfixApi.markAllNotificationsRead({
      userId: currentUser.id,
      role: currentUser.role,
    });
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadNotificationCount(0);
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
        notifications,
        unreadNotificationCount,
        login,
        logout,
        selectedReportId,
        addReport,
        updateReport,
        watchReport,
        refreshNotifications,
        markAllNotificationsRead,
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
