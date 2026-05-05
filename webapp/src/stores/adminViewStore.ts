/**
 * Admin-view toggle — session-scoped (sessionStorage), audit-logged on every
 * entry/exit via the server. Lets users with canRequestAdminView=true (Lane)
 * temporarily render admin internals on case routes without changing role.
 *
 * Per ADMIN-PANEL-SPEC.md §Lane's expert-toggle:
 *   "Toggle persists in sessionStorage, expires on logout, audit-logged."
 *
 * The authStore.logout() also clears this key, so explicit logout disables
 * the toggle even before the tab session ends.
 */
import { create } from 'zustand';
import { api } from '../lib/api';

const STORAGE_KEY = 'bb_admin_view';

function readInitial(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

interface AdminViewState {
  enabled: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

export const useAdminViewStore = create<AdminViewState>((set, get) => ({
  enabled: readInitial(),
  loading: false,

  toggle: async () => {
    if (get().loading) return;
    const next = !get().enabled;
    set({ loading: true });
    try {
      await api.toggleAdminView(next);
      try { sessionStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* ignore */ }
      set({ enabled: next, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
}));

/**
 * "Effective admin" for component-level role gating: real admin role OR an
 * expert who has flipped the admin-view toggle on. Used by surfaces like
 * StageNavV2 / AgentActivityFeedV2 to decide whether to render.
 */
export function isEffectiveAdmin(role: string | undefined, adminViewEnabled: boolean): boolean {
  return role === 'admin' || adminViewEnabled;
}

/**
 * Hook that resolves effective-admin from both stores. Subscribes to role
 * (authStore) and adminViewEnabled (this store) so components re-render when
 * either changes.
 */
import { useAuthStore } from './authStore';
export function useEffectiveAdmin(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const adminView = useAdminViewStore((s) => s.enabled);
  return isEffectiveAdmin(role, adminView);
}
