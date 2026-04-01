import { create } from 'zustand';
import { createSSE, api } from '../lib/api';
import type { SSEMessage } from '../lib/api';

interface AgentState {
  status: 'idle' | 'running' | 'complete' | 'error';
  logs: SSEMessage[];
  eventSource: EventSource | null;
  connectSSE: (caseId: string) => void;
  disconnectSSE: () => void;
  triggerAgent: (caseId: string, stage: string, feedback?: string) => Promise<void>;
  clearLogs: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  status: 'idle',
  logs: [],
  eventSource: null,

  connectSSE: (caseId) => {
    get().disconnectSSE();
    const es = createSSE(caseId, (msg) => {
      set((s) => ({ logs: [...s.logs, msg] }));
      if (msg.type === 'complete') set({ status: 'complete' });
      if (msg.type === 'error') set({ status: 'error' });
    });
    set({ eventSource: es });
  },

  disconnectSSE: () => {
    const { eventSource } = get();
    if (eventSource) { eventSource.close(); set({ eventSource: null }); }
  },

  triggerAgent: async (caseId, stage, feedback) => {
    set({ status: 'running', logs: [] });
    try {
      await api.triggerAgent(caseId, stage, feedback);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent failed to start';
      set((s) => ({ status: 'error', logs: [...s.logs, { type: 'error', message }] }));
    }
  },

  clearLogs: () => set({ logs: [], status: 'idle' }),
}));
