const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export interface BackendIssue {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  created_at: string;
  updated_at: string;
  category: string;
  assigned_team_id: number | null;
  assigned_team: string | null;
  image_url: string | null;
  ai_status?: string;
  ai_category?: string | null;
  ai_severity?: string | null;
  ai_confidence?: number | string | null;
  ai_summary?: string | null;
  ai_photo_match?: boolean | null;
  ai_photo_match_confidence?: number | string | null;
  duplicate_of?: number | null;
  watcher_count?: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
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
}

export interface NotificationItem {
  id: number;
  user_id: number | null;
  recipient_role: string | null;
  issue_id: number | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DuplicateIssueResponse {
  duplicate: true;
  issue: BackendIssue;
  distanceMeters: number;
  watcherCount: number;
  alreadyWatching: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`CivicFix API request failed: ${status} ${statusText}`);
    this.status = status;
    this.body = body;
  }
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, payload);
  }

  return payload.data;
};

export const civicfixApi = {
  login: (credentials: { email: string; password: string }) =>
    request<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getIssues: () => request<BackendIssue[]>('/api/issues'),
  getCategories: () => request<BackendCategory[]>('/api/categories'),
  getTeams: () => request<BackendTeam[]>('/api/teams'),
  createIssue: (issue: {
    title: string;
    description: string;
    categoryId: number;
    address: string;
    latitude: number;
    longitude: number;
    imageDataUrl?: string;
    imageName?: string;
    userId?: number;
    watcherKey?: string;
  }) =>
    request<BackendIssue | DuplicateIssueResponse>('/api/issues', {
      method: 'POST',
      body: JSON.stringify(issue),
    }),
  watchIssue: (issueId: number, payload: { userId?: number; watcherKey?: string }) =>
    request<{ watcherCount: number; alreadyWatching: boolean }>(`/api/issues/${issueId}/watch`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getNotifications: (payload: { userId?: number; role?: AuthUser['role'] }) => {
    const params = new URLSearchParams();
    if (payload.userId) params.set('userId', String(payload.userId));
    if (payload.role) params.set('role', payload.role);
    return request<{ notifications: NotificationItem[]; unreadCount: number }>(`/api/notifications?${params.toString()}`);
  },
  markAllNotificationsRead: (payload: { userId?: number; role?: AuthUser['role'] }) =>
    request<{ success: boolean }>('/api/notifications/mark-all-read', {
      method: 'PATCH',
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
};
