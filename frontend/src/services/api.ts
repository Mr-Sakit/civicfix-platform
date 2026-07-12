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

interface ApiResponse<T> {
  data: T;
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`CivicFix API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
};

export const civicfixApi = {
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
  }) =>
    request<BackendIssue>('/api/issues', {
      method: 'POST',
      body: JSON.stringify(issue),
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
