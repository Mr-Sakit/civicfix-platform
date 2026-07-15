export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const TOKEN_STORAGE_KEY = 'civicfix_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export interface BackendIssue {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  severity: 'low' | 'mid' | 'high';
  watcher_count: number;
  archived: boolean;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  created_at: string;
  updated_at: string;
  category: string;
  category_id: number;
  assigned_team_id: number | null;
  assigned_team: string | null;
  image_url: string | null;
  after_photo_url: string | null;
  reported_by: number | null;
  ai_status: string;
  ai_category: string | null;
  ai_severity: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_photo_match: boolean | null;
  ai_photo_match_confidence: number | null;
  duplicate_of: number | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'citizen' | 'admin' | 'crew';
  teamId: number | null;
  teamName: string | null;
}

export interface BackendCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface BackendTeam {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  category: string | null;
}

export interface NotificationItem {
  id: number;
  issue_id: number | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DuplicateCandidate {
  issueId: number;
  title: string;
  distanceMeters: number;
  photoSimilarity?: { similar: boolean; confidence: number };
}

export interface DuplicateCheckResult {
  candidates: DuplicateCandidate[];
  recommendHighConfidenceDuplicateId?: number;
}

interface ApiResponse<T> {
  data: T;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message ?? `CivicFix API request failed: ${status}`);
    this.status = status;
    this.body = body;
  }
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return (payload as ApiResponse<T>).data;
};

export const civicfixApi = {
  login: (credentials: { email: string; password: string }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  signup: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: 'citizen' | 'admin' | 'crew';
    teamId?: number;
  }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getIssues: (options?: { includeArchived?: boolean }) =>
    request<BackendIssue[]>(`/api/issues${options?.includeArchived ? '?includeArchived=true' : ''}`),
  getCategories: () => request<BackendCategory[]>('/api/categories'),
  getTeams: () => request<BackendTeam[]>('/api/teams'),
  createIssue: (issue: {
    title: string;
    description: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    imageDataUrl?: string;
    imageName?: string;
    forceCreate?: boolean;
  }) =>
    request<BackendIssue | { duplicate: true; issue: BackendIssue; watcherCount: number; alreadyWatching: boolean }>(
      '/api/issues',
      {
        method: 'POST',
        body: JSON.stringify(issue),
      }
    ),
  checkDuplicate: (payload: {
    latitude: number | null;
    longitude: number | null;
    categoryId?: number;
    title?: string;
    description?: string;
    imageDataUrl?: string;
  }) =>
    request<DuplicateCheckResult>('/api/issues/duplicate-check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateIssueStatus: (issueId: number, status: string, note?: string) =>
    request<BackendIssue>(`/api/issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  assignIssue: (issueId: number, teamId: number) =>
    request<BackendIssue>(`/api/issues/${issueId}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify({ teamId }),
    }),
  routeIssue: (issueId: number, teamId: number) =>
    request<BackendIssue>(`/api/issues/${issueId}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify({ teamId }),
    }),
  reviewIssue: (issueId: number) =>
    request<BackendIssue>(`/api/issues/${issueId}/review`, { method: 'PATCH' }),
  watchIssue: (issueId: number) =>
    request<{ watcherCount: number; alreadyWatching: boolean }>(`/api/issues/${issueId}/watch`, {
      method: 'PATCH',
    }),
  archiveIssue: (issueId: number, archived = true) =>
    request<BackendIssue>(`/api/issues/${issueId}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    }),
  crewAccept: (issueId: number) =>
    request<BackendIssue>(`/api/issues/${issueId}/crew-accept`, { method: 'PATCH' }),
  crewResolve: (issueId: number, afterImageDataUrl: string, afterImageName?: string) =>
    request<BackendIssue>(`/api/issues/${issueId}/crew-resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ afterImageDataUrl, afterImageName }),
    }),
  approveFix: (issueId: number) =>
    request<BackendIssue>(`/api/issues/${issueId}/approve-fix`, { method: 'PATCH' }),
  deleteIssue: (issueId: number) =>
    request<{ success: boolean; id: number }>(`/api/issues/${issueId}`, { method: 'DELETE' }),
  getIssueHistory: (issueId: number) =>
    request<Array<{ id: number; old_status: string | null; new_status: string; note: string | null; created_at: string; changed_by: string | null }>>(
      `/api/issues/${issueId}/history`
    ),
  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/mark-all-read', { method: 'PATCH' }),
  getMetricsSummary: () =>
    request<{
      totalIssues: number;
      byStatus: Array<{ status: string; count: number }>;
      byCategory: Array<{ name: string; count: number }>;
      byTeam: Array<{ name: string; count: number }>;
      archivedCount: number;
      avgResolutionHours: number | null;
      totalWatchers: number;
      bySeverity: Array<{ severity: string; count: number }>;
    }>('/api/metrics/summary'),
};
