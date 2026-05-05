import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  role: string;
  canRequestAdminView: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const ADMIN_VIEW_STORAGE_KEY = 'bb_admin_view';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('bb_token'),
  loading: true,

  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('bb_token', token);
    set({ token, user, loading: false });
  },

  logout: () => {
    localStorage.removeItem('bb_token');
    // Admin-view toggle is session-scoped — clear on explicit logout.
    try { sessionStorage.removeItem(ADMIN_VIEW_STORAGE_KEY); } catch { /* ignore */ }
    set({ token: null, user: null, loading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('bb_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const user = await api.me();
      set({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          canRequestAdminView: user.canRequestAdminView,
        },
        token,
        loading: false,
      });
    } catch {
      localStorage.removeItem('bb_token');
      try { sessionStorage.removeItem(ADMIN_VIEW_STORAGE_KEY); } catch { /* ignore */ }
      set({ token: null, user: null, loading: false });
    }
  },
}));
