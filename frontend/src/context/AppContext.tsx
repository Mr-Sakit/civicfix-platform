import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { civicfixApi, getStoredToken, setStoredToken } from '../services/api';
import type { AuthUser, BackendCategory, BackendIssue, BackendTeam, NotificationItem } from '../services/api';
import { ApiError } from '../services/api';
import { DEFAULT_MAP_CENTER } from '../constants/map';

export const CATEGORY_NAMES = [
  'Road Damage',
  'Street Lighting',
  'Waste Management',
  'Water Leak',
  'Public Safety',
] as const;

export type ReportCategory = (typeof CATEGORY_NAMES)[number];

export type ReportStatus =
  | 'submitted'
  | 'under_admin_review'
  | 'assigned_to_crew'
  | 'crew_accepted'
  | 'pending_ai_verification'
  | 'resolved'
  | 'rejected_mismatch';

export type ReportBucket = 'Reported' | 'In Progress' | 'Resolved';

export const getStatusBucket = (status: ReportStatus): ReportBucket => {
  if (status === 'resolved') return 'Resolved';
  if (status === 'submitted' || status === 'under_admin_review' || status === 'rejected_mismatch') return 'Reported';
  return 'In Progress';
};

export interface Report {
  id: string;
  backendId?: number;
  title: string;
  description: string;
  location: string;
  category: ReportCategory;
  categoryId?: number;
  priority: 'High' | 'Medium' | 'Low';
  status: ReportStatus;
  date: string;
  image: string;
  afterImage?: string;
  assignedTo: string;
  assignedTeamId?: number | null;
  reporter: string;
  reporterId?: number | null;
  lat: number | null;
  lng: number | null;
  isUrgent: boolean;
  notes?: string;
  imageName?: string;
  watcherCount: number;
  severity: 'low' | 'mid' | 'high';
  archived: boolean;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  aiSummary?: string | null;
  aiPhotoMatch?: boolean | null;
}

export type AddReportInput = {
  title: string;
  description: string;
  location: string;
  image: string;
  imageName?: string;
  lat: number | null;
  lng: number | null;
  forceCreate?: boolean;
};

export type AddReportResult =
  | { status: 'created'; report: Report }
  | { status: 'duplicate'; existingReport: Report }
  | { status: 'mismatch'; message: string }
  | { status: 'error'; message: string };

type Role = 'citizen' | 'admin' | 'crew';

interface AppContextType {
  reports: Report[];
  isApiConnected: boolean;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  userRole: Role;
  activeTab: string;
  categories: BackendCategory[];
  teams: BackendTeam[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { fullName: string; email: string; password: string; role: Role; teamId?: number }) => Promise<void>;
  logout: () => void;
  selectedReportId: string;
  addReport: (report: AddReportInput) => Promise<AddReportResult>;
  updateReport: (id: string, updates: Partial<Report>) => Promise<void>;
  watchReport: (id: string) => Promise<void>;
  archiveReport: (id: string, archived?: boolean) => Promise<void>;
  reviewReport: (id: string) => Promise<void>;
  routeReportToTeam: (id: string, teamId: number) => Promise<void>;
  crewAcceptReport: (id: string) => Promise<void>;
  crewResolveReport: (id: string, afterImageDataUrl: string, afterImageName?: string) => Promise<Report | null>;
  approveFix: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  refreshIssues: () => Promise<void>;
  setUserRole: (role: Role) => void;
  setActiveTab: (tab: string) => void;
  navigateToReportDetail: (backendId: number) => void;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

const routeByRoleAndTab: Record<Role, Record<string, string>> = {
  citizen: {
    home: '/',
    activity: '/activity',
    report: '/report',
    reportDetail: '/reports',
    map: '/map',
  },
  admin: {
    dashboard: '/admin',
    map: '/admin/map',
  },
  crew: {
    dashboard: '/crew',
  },
};

const getRouteState = (pathname: string): { role: Role; tab: string } => {
  if (pathname.startsWith('/admin/map')) return { role: 'admin', tab: 'map' };
  if (pathname.startsWith('/admin')) return { role: 'admin', tab: 'dashboard' };
  if (pathname.startsWith('/crew')) return { role: 'crew', tab: 'dashboard' };
  if (pathname.startsWith('/reports/')) return { role: 'citizen', tab: 'reportDetail' };
  if (pathname.startsWith('/activity')) return { role: 'citizen', tab: 'activity' };
  if (pathname.startsWith('/map')) return { role: 'citizen', tab: 'map' };
  if (pathname.startsWith('/report')) return { role: 'citizen', tab: 'report' };
  return { role: 'citizen', tab: 'home' };
};

const defaultTabByRole: Record<Role, string> = {
  citizen: 'home',
  admin: 'dashboard',
  crew: 'dashboard',
};

// Redirects a signed-in user away from routes that belong to a different role
// (e.g. a citizen hitting /admin directly) back to their own default tab.
const getProtectedRouteState = (role: Role, pathname: string): { role: Role; tab: string; path: string } => {
  const routeState = getRouteState(pathname);

  if (routeState.role !== role) {
    const tab = defaultTabByRole[role];
    return { role, tab, path: routeByRoleAndTab[role][tab] };
  }

  const tab = routeByRoleAndTab[role][routeState.tab] ? routeState.tab : defaultTabByRole[role];
  return { role, tab, path: routeByRoleAndTab[role][tab] };
};

const normalizePriority = (priority: string): Report['priority'] => {
  const value = (priority ?? '').toLowerCase();
  if (value.includes('critical') || value.includes('high') || value.includes('urgent')) return 'High';
  if (value.includes('low')) return 'Low';
  return 'Medium';
};

const normalizeCategory = (category: string): ReportCategory => {
  const match = CATEGORY_NAMES.find((name) => name === category);
  return match ?? 'Public Safety';
};

// Reports may not be present in the currently-loaded `reports` list (e.g. an archived
// report while viewing the admin "Archived" tab), so action methods resolve the backend
// id directly from the `#FIX-<id>` string instead of looking it up via reports.find().
const parseBackendId = (id: string): number | null => {
  const match = /^#FIX-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
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

export const mapBackendIssue = (issue: BackendIssue): Report => ({
  id: `#FIX-${issue.id}`,
  backendId: issue.id,
  title: issue.title,
  description: issue.description,
  location: issue.address ?? 'Location not provided',
  category: normalizeCategory(issue.category),
  categoryId: issue.category_id,
  priority: normalizePriority(issue.priority),
  status: issue.status as ReportStatus,
  date: formatRelativeDate(issue.created_at),
  image: issue.image_url ?? '',
  afterImage: issue.after_photo_url ?? undefined,
  assignedTo: issue.assigned_team ?? 'Unassigned',
  assignedTeamId: issue.assigned_team_id,
  reporter: 'CivicFix Resident',
  reporterId: issue.reported_by,
  lat: issue.latitude != null ? Number(issue.latitude) : null,
  lng: issue.longitude != null ? Number(issue.longitude) : null,
  isUrgent: normalizePriority(issue.priority) === 'High',
  watcherCount: issue.watcher_count ?? 0,
  severity: issue.severity ?? 'low',
  archived: Boolean(issue.archived),
  aiCategory: issue.ai_category,
  aiConfidence: issue.ai_confidence,
  aiSummary: issue.ai_summary,
  aiPhotoMatch: issue.ai_photo_match,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('civicfix_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [reports, setReports] = useState<Report[]>([]);
  const initialRoute = getRouteState(window.location.pathname);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [teams, setTeams] = useState<BackendTeam[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userRole, setUserRoleState] = useState<Role>(currentUser?.role ?? initialRoute.role);
  const [activeTab, setActiveTabState] = useState<string>(
    currentUser ? getProtectedRouteState(currentUser.role, window.location.pathname).tab : initialRoute.tab
  );
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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

  const refreshIssues = useCallback(async () => {
    try {
      // includeArchived so citizens still see their auto-archived Resolved reports —
      // "archived" only means "off the admin's active queue," not "hidden from citizens."
      const [apiIssues, apiCategories, apiTeams] = await Promise.all([
        civicfixApi.getIssues({ includeArchived: true }),
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
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const result = await civicfixApi.getNotifications();
      setNotifications(result.notifications);
      setUnreadNotificationCount(result.unreadCount);
    } catch {
      // ignore — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    void refreshIssues();
  }, [refreshIssues]);

  useEffect(() => {
    const interval = setInterval(() => void refreshIssues(), 15000);
    return () => clearInterval(interval);
  }, [refreshIssues]);

  useEffect(() => {
    if (currentUser) void refreshNotifications();
  }, [currentUser, refreshNotifications]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => void refreshNotifications(), 15000);
    return () => clearInterval(interval);
  }, [currentUser, refreshNotifications]);

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

  const navigateTo = (role: Role, tab: string) => {
    const effectiveRole = currentUser?.role ?? role;
    const safeTab = routeByRoleAndTab[effectiveRole][tab] ? tab : defaultTabByRole[effectiveRole];
    const nextPath = routeByRoleAndTab[effectiveRole][safeTab];

    setUserRoleState(effectiveRole);
    setActiveTabState(safeTab);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const navigateToReportDetail = (backendId: number) => {
    setSelectedReportId(`#FIX-${backendId}`);
    setUserRoleState('citizen');
    setActiveTabState('reportDetail');
    window.history.pushState({}, '', `/reports/${backendId}`);
  };

  const login = async (email: string, password: string) => {
    const { user, token } = await civicfixApi.login({ email, password });
    setStoredToken(token);
    setCurrentUser(user);
    navigateTo(user.role, user.role === 'citizen' ? 'home' : 'dashboard');
    await Promise.all([refreshIssues(), refreshNotifications()]);
  };

  const signup = async (payload: { fullName: string; email: string; password: string; role: Role; teamId?: number }) => {
    const { user, token } = await civicfixApi.signup(payload);
    setStoredToken(token);
    setCurrentUser(user);
    navigateTo(user.role, user.role === 'citizen' ? 'home' : 'dashboard');
    await Promise.all([refreshIssues(), refreshNotifications()]);
  };

  const logout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setUserRoleState('citizen');
    setActiveTabState('home');
    window.history.replaceState({}, '', '/');
  };

  const addReport = async (input: AddReportInput): Promise<AddReportResult> => {
    try {
      const created = await civicfixApi.createIssue({
        title: input.title,
        description: input.description,
        address: input.location,
        latitude: input.lat,
        longitude: input.lng,
        imageDataUrl: input.image,
        imageName: input.imageName,
        forceCreate: input.forceCreate,
      });

      if ('duplicate' in created && created.duplicate) {
        const existingReport = mapBackendIssue(created.issue);
        await refreshIssues();
        return { status: 'duplicate', existingReport };
      }

      const report = mapBackendIssue(created as BackendIssue);
      setReports((prev) => [report, ...prev]);
      setSelectedReportId(report.id);
      setIsApiConnected(true);
      void refreshNotifications();
      return { status: 'created', report };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.body?.mismatch) {
        return { status: 'mismatch', message: error.body.message ?? 'The photo does not match your description.' };
      }

      if (error instanceof ApiError && error.status === 422) {
        const body = error.body as { message?: string; data?: { reason?: string } };
        return {
          status: 'mismatch',
          message: body.data?.reason
            ? `${body.message ?? 'The uploaded photo does not match the report.'} ${body.data.reason}`
            : body.message ?? 'The uploaded photo does not appear to match this report.',
        };
      }

      if (error instanceof ApiError && error.status === 413) {
        return {
          status: 'error',
          message: 'The selected photo is too large to upload. Please choose a smaller image or take a lower-resolution photo.'
        };
      }

      setIsApiConnected(false);
      return { status: 'error', message: error instanceof Error ? error.message : 'Failed to submit report.' };
    }
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    setReports((prev) => prev.map((report) => (report.id === id ? { ...report, ...updates } : report)));

    const backendId = parseBackendId(id);
    if (backendId == null) return;

    try {
      if (updates.assignedTeamId != null) {
        await civicfixApi.assignIssue(backendId, updates.assignedTeamId);
      }
      if (updates.status) {
        await civicfixApi.updateIssueStatus(backendId, updates.status, updates.notes);
      }
      setIsApiConnected(true);
      await refreshIssues();
    } catch {
      setIsApiConnected(false);
    }
  };

  const watchReport = async (id: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    const result = await civicfixApi.watchIssue(backendId);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, watcherCount: result.watcherCount } : r)));
  };

  const archiveReport = async (id: string, archived = true) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.archiveIssue(backendId, archived);
    await refreshIssues();
  };

  const reviewReport = async (id: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.reviewIssue(backendId);
    await refreshIssues();
  };

  const routeReportToTeam = async (id: string, teamId: number) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.routeIssue(backendId, teamId);
    await refreshIssues();
  };

  const crewAcceptReport = async (id: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.crewAccept(backendId);
    await refreshIssues();
  };

  const crewResolveReport = async (id: string, afterImageDataUrl: string, afterImageName?: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return null;
    const updated = await civicfixApi.crewResolve(backendId, afterImageDataUrl, afterImageName);
    await refreshIssues();
    return mapBackendIssue(updated);
  };

  const approveFix = async (id: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.approveFix(backendId);
    await refreshIssues();
  };

  const deleteReport = async (id: string) => {
    const backendId = parseBackendId(id);
    if (backendId == null) return;
    await civicfixApi.deleteIssue(backendId);
    setReports((prev) => prev.filter((r) => r.id !== id));
    await refreshIssues();
  };

  const markAllNotificationsRead = async () => {
    await civicfixApi.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadNotificationCount(0);
  };

  const setUserRole = (role: Role) => {
    navigateTo(role, role === 'citizen' ? 'home' : 'dashboard');
  };

  const setActiveTab = (tab: string) => {
    navigateTo(currentUser?.role ?? userRole, tab);
  };

  const addWizardPhoto = (photoUrl: string) => setWizardPhotos((prev) => [...prev, photoUrl]);
  const removeWizardPhoto = (index: number) => setWizardPhotos((prev) => prev.filter((_, i) => i !== index));
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
        categories,
        teams,
        notifications,
        unreadNotificationCount,
        refreshNotifications,
        markAllNotificationsRead,
        login,
        signup,
        logout,
        selectedReportId,
        addReport,
        updateReport,
        watchReport,
        archiveReport,
        reviewReport,
        routeReportToTeam,
        crewAcceptReport,
        crewResolveReport,
        approveFix,
        deleteReport,
        refreshIssues,
        setUserRole,
        setActiveTab,
        navigateToReportDetail,
        setSelectedReportId,
        wizardStep,
        setWizardStep,
        wizardPhotos,
        addWizardPhoto,
        removeWizardPhoto,
        clearWizard,
        uploadProgress,
        setUploadProgress,
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

export { DEFAULT_MAP_CENTER };
