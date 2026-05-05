import { create } from 'zustand';
import { createSSE, api } from '../lib/api';
import type { SSEMessage } from '../lib/api';
import type { PatternCTrigger } from '../lib/patternC';

interface AutoAdvanceEvent {
  from: string;
  to: string;
}

interface HITLEvent {
  stage: string;
  triggers: PatternCTrigger[];
  payload?: Record<string, unknown>;
}

interface AgentState {
  status: 'idle' | 'running' | 'complete' | 'error';
  logs: SSEMessage[];
  eventSource: EventSource | null;
  autoAdvanceEvent: AutoAdvanceEvent | null;
  hitlEvent: HITLEvent | null;
  connectSSE: (caseId: string) => void;
  disconnectSSE: () => void;
  triggerAgent: (caseId: string, stage: string, feedback?: string) => Promise<void>;
  clearLogs: () => void;
  clearAutoAdvanceEvent: () => void;
  clearHITLEvent: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  status: 'idle',
  logs: [],
  eventSource: null,
  autoAdvanceEvent: null,
  hitlEvent: null,

  connectSSE: (caseId) => {
    get().disconnectSSE();
    const es = createSSE(caseId, (msg) => {
      set((s) => ({ logs: [...s.logs, msg] }));
      if (msg.type === 'complete') set({ status: 'complete' });
      if (msg.type === 'error') set({ status: 'error' });
      if (msg.type === 'auto_advance') {
        set({
          autoAdvanceEvent: {
            from: (msg.metadata?.from as string) ?? '',
            to: (msg.metadata?.to as string) ?? '',
          },
        });
      }
      if (msg.type === 'hitl_required') {
        set({
          hitlEvent: {
            stage: (msg.metadata?.stage as string) ?? '',
            triggers: (msg.metadata?.triggers as PatternCTrigger[] | undefined) ?? [],
            payload: msg.metadata,
          },
        });
      }
    });
    set({ eventSource: es });
  },

  disconnectSSE: () => {
    const { eventSource } = get();
    if (eventSource) { eventSource.close(); set({ eventSource: null }); }
  },

  triggerAgent: async (caseId, stage, feedback) => {
    set({ status: 'running', logs: [], autoAdvanceEvent: null, hitlEvent: null });
    try {
      await api.triggerAgent(caseId, stage, feedback);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent failed to start';
      set((s) => ({ status: 'error', logs: [...s.logs, { type: 'error', message }] }));
    }
  },

  clearLogs: () => set({ logs: [], status: 'idle', autoAdvanceEvent: null, hitlEvent: null }),
  clearAutoAdvanceEvent: () => set({ autoAdvanceEvent: null }),
  clearHITLEvent: () => set({ hitlEvent: null }),
}));
