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
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(body.error || 'Request failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
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

  // Notes
  getNotes: (caseId: string) =>
    request<{ notes: Note[] }>(`/cases/${caseId}/notes`),
  createNote: (caseId: string, body: string) =>
    request<{ note: Note }>(`/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteNote: (caseId: string, noteId: string) =>
    request<void>(`/cases/${caseId}/notes/${noteId}`, { method: 'DELETE' }),

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

  // QA
  getQAScorecard: (caseId: string) =>
    request<{ qa: QAScorecard | null; ranAt: string | null }>(`/cases/${caseId}/qa`),

  // Reports
  getReport: (caseId: string) => request<{ content: string; sections: Section[]; version: number }>(`/cases/${caseId}/report`),
  saveReport: (caseId: string, content: string) =>
    request<{ saved: boolean }>(`/cases/${caseId}/report`, { method: 'PUT', body: JSON.stringify({ content }) }),
  // Binary export — bypasses the JSON request helper. Returns a Blob the caller can download.
  exportReport: async (caseId: string, format: 'pdf' | 'docx'): Promise<Blob> => {
    const token = localStorage.getItem('bb_token');
    const res = await fetch(`${API_BASE}/cases/${caseId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ format }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `Export failed (${res.status})`);
    }
    return res.blob();
  },
};

export function createSSE(caseId: string, onMessage: (data: SSEMessage) => void): EventSource {
  const token = localStorage.getItem('bb_token');
  const es = new EventSource(`${API_BASE}/cases/${caseId}/agents/stream?token=${token}`);
  es.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch { /* ignore malformed SSE data */ } };
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

export interface Note {
  id: string; caseId: string; body: string; createdAt: string; updatedAt: string;
}

export interface Doc {
  id: string; filename: string; filepath: string; sizeBytes: number | null; pageCount: number | null; extractedText: string | null; uploadedAt: string;
}

export interface AgentLog {
  id: number; stage: string; type: string; message: string; metadata: Record<string, unknown> | null; createdAt: string;
}

export interface ReportData { content: string | null; sections: Section[] | null; version: number; }
export interface Section { title: string; order: number; }
export interface SSEMessage { type: string; message: string; timestamp?: string; metadata?: Record<string, unknown>; stage?: string; }

// QA scorecard schema — emitted by the QA agent (agents/qa/BlackBar-QA.md OUTPUT CONTRACT)
export interface QAScorecard {
  score: number;
  benchmarkMatch?: number;
  checks: { name: string; status: 'pass' | 'warning' | 'fail'; detail: string }[];
  issues: { severity: 'critical' | 'warning' | 'info'; description: string; location: string }[];
}

// Typed agent contract outputs — mirror of webapp/server/types/agentContracts.ts.
// Each pipeline stage emits a JSON summary block at the end of its response;
// the server validates and persists it as agent_logs.metadata.parsed on the
// `complete` row, and the same object is broadcast on the SSE complete event.

export interface IntakeResult {
  documents: Array<{
    name: string;
    type: 'deposition' | 'expert_report' | 'code_standard' | 'photograph' | 'contract' | 'correspondence' | 'other';
    pages: number;
  }>;
  flags: string[];
  missingFields: string[];
  caseType: string;
  reportType: string;
  noteCount?: number;
  notesSummary?: string;
}

export interface ResearchResult {
  findings: Array<{
    id: string;
    opposingClaim: string;
    codeReference: string;
    reasoning: string;
    attackPattern: string;
    sourceDocument: string;
    sourcePage: number;
  }>;
  standardsReferenced: string[];
  attackPatternsUsed: string[];
}

export interface DraftingResult {
  sections: Array<{ title: string; wordCount: number; hasPlaceholders: boolean }>;
  totalWordCount: number;
  placeholders: string[];
  voiceScore: number;
  benchmarkUsed: string;
}

// Type-safe parsers — pull a typed result out of an SSE/log message's metadata.
// Return null if the metadata is missing or fails the structural check, so the
// calling component can render a graceful fallback UI.

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object';
}

export function parseIntakeFromMetadata(meta: Record<string, unknown> | null | undefined): IntakeResult | null {
  const p = meta?.parsed;
  if (!isObj(p)) return null;
  if (!Array.isArray(p.documents) || !Array.isArray(p.flags) || !Array.isArray(p.missingFields)) return null;
  return p as unknown as IntakeResult;
}

export function parseResearchFromMetadata(meta: Record<string, unknown> | null | undefined): ResearchResult | null {
  const p = meta?.parsed;
  if (!isObj(p)) return null;
  if (!Array.isArray(p.findings) || !Array.isArray(p.standardsReferenced) || !Array.isArray(p.attackPatternsUsed)) return null;
  return p as unknown as ResearchResult;
}

export function parseDraftingFromMetadata(meta: Record<string, unknown> | null | undefined): DraftingResult | null {
  const p = meta?.parsed;
  if (!isObj(p)) return null;
  if (!Array.isArray(p.sections) || typeof p.totalWordCount !== 'number' || !Array.isArray(p.placeholders)) return null;
  return p as unknown as DraftingResult;
}

export interface CreateCasePayload {
  name: string; caseType?: string; reportType?: string;
  jurisdiction?: string; opposingExpert?: string; deadline?: string;
}
