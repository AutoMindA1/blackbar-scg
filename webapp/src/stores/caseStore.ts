import { create } from 'zustand';
import { api } from '../lib/api';
import type { CaseSummary, CaseDetail, CreateCasePayload } from '../lib/api';

interface CaseState {
  cases: CaseSummary[];
  activeCase: CaseDetail | null;
  loading: boolean;
  error: string | null;
  fetchCases: () => Promise<void>;
  fetchCase: (id: string) => Promise<void>;
  createCase: (data: CreateCasePayload) => Promise<CaseDetail>;
  updateStage: (id: string, stage: string) => void;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  activeCase: null,
  loading: false,
  error: null,

  fetchCases: async () => {
    set({ loading: true, error: null });
    try {
      const { cases } = await api.getCases();
      set({ cases, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load cases' });
    }
  },

  fetchCase: async (id) => {
    set({ loading: true, error: null });
    try {
      const detail = await api.getCase(id);
      set({ activeCase: detail, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load case' });
    }
  },

  createCase: async (data) => {
    const c = await api.createCase(data);
    await get().fetchCases();
    return c;
  },

  updateStage: (id, stage) => {
    const { activeCase, cases } = get();
    if (activeCase?.id === id) set({ activeCase: { ...activeCase, stage } });
    set({ cases: cases.map((c) => c.id === id ? { ...c, stage } : c) });
  },
}));
