const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('bb_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; role: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; name: string; role: string; email: string }>('/auth/me'),

  // Cases
  getCases: () => request<{ cases: CaseSummary[] }>('/cases'),
  getCase: (id: string) => request<CaseDetail>(`/cases/${id}`),
  createCase: (data: CreateCasePayload) =>
    request<CaseDetail>('/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCase: (id: string, data: Record<string, unknown>) =>
    request<CaseDetail>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Documents
  uploadDocuments: (caseId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return request<{ documents: Doc[] }>(`/cases/${caseId}/documents`, { method: 'POST', body: form });
  },
  getDocuments: (caseId: string) => request<{ documents: Doc[] }>(`/cases/${caseId}/documents`),

  // Agents
  triggerAgent: (caseId: string, stage: string, feedback?: string) =>
    request<{ status: string; jobId: string }>(`/cases/${caseId}/agents/${stage}`, {
      method: 'POST', body: JSON.stringify({ feedback }),
    }),
  approve: (caseId: string, stage: string, action: string, notes?: string) =>
    request<{ nextStage: string; status: string }>(`/cases/${caseId}/approve`, {
      method: 'POST', body: JSON.stringify({ stage, action, notes }),
    }),

  // Reports
  getReport: (caseId: string) => request<{ content: string; sections: Section[]; version: number }>(`/cases/${caseId}/report`),
  saveReport: (caseId: string, content: string) =>
    request<{ saved: boolean }>(`/cases/${caseId}/report`, { method: 'PUT', body: JSON.stringify({ content }) }),
  exportReport: (caseId: string, format: string) =>
    request<Blob>(`/cases/${caseId}/export`, { method: 'POST', body: JSON.stringify({ format }) }),
};

export function createSSE(caseId: string, onMessage: (data: SSEMessage) => void): EventSource {
  const token = localStorage.getItem('bb_token');
  const es = new EventSource(`${API_BASE}/cases/${caseId}/agents/stream?token=${token}`);
  es.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
  return es;
}

// Types
export interface CaseSummary {
  id: string; name: string; caseType: string | null; reportType: string | null;
  stage: string; jurisdiction: string | null; opposingExpert: string | null;
  documentCount: number; lastActivity: string; createdAt: string;
}

export interface CaseDetail {
  id: string; name: string; caseType: string | null; reportType: string | null;
  jurisdiction: string | null; opposingExpert: string | null; deadline: string | null;
  stage: string; createdAt: string; updatedAt: string;
  documents: Doc[]; agentLogs: AgentLog[]; report: ReportData | null;
}

export interface Doc {
  id: string; filename: string; filepath: string; sizeBytes: number | null; pageCount: number | null; uploadedAt: string;
}

export interface AgentLog {
  id: number; stage: string; type: string; message: string; metadata: Record<string, unknown> | null; createdAt: string;
}

export interface ReportData { content: string | null; sections: Section[] | null; version: number; }
export interface Section { title: string; order: number; }
export interface SSEMessage { type: string; message: string; timestamp?: string; metadata?: Record<string, unknown>; stage?: string; }

export interface CreateCasePayload {
  name: string; caseType?: string; reportType?: string;
  jurisdiction?: string; opposingExpert?: string; deadline?: string;
}
