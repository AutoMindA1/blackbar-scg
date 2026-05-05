import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, LogOut, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAdminViewStore } from '../../stores/adminViewStore';
import BearMark from '../shared/BearMark';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const adminViewEnabled = useAdminViewStore((s) => s.enabled);
  const adminViewLoading = useAdminViewStore((s) => s.loading);
  const toggleAdminView = useAdminViewStore((s) => s.toggle);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const showAdminToggle = !!user && (user.role === 'admin' || user.canRequestAdminView);
  const handleToggle = async () => {
    try { await toggleAdminView(); } catch { /* surface UI feedback in a follow-up; for now silent */ }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
    }`;

  return (
    <aside className="w-60 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)] flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand — Bear icon */}
      <div className="p-5 border-b border-[var(--color-border-brass)]">
        <div className="flex items-center gap-3">
          <BearMark variant="icon" size="md" />
          <div>
            <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)] leading-none">
              Black<span className="text-[var(--color-accent-primary)]">Bar</span>
            </h1>
            <p className="font-display text-[11px] italic text-[var(--color-accent-primary)] mt-0.5">Savage Wins</p>
          </div>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] mt-2">Swainston Consulting Group</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/cases" end={false} className={linkClass}>
          <FolderOpen className="w-4 h-4" />
          Active Cases
        </NavLink>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[var(--color-border)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)]">
            {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-primary)] truncate">{user?.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {showAdminToggle && (
          <button
            onClick={handleToggle}
            disabled={adminViewLoading}
            aria-pressed={adminViewEnabled}
            title={adminViewEnabled
              ? 'Admin view active — every entry/exit is audit-logged'
              : 'Surface admin internals on case routes (audit-logged)'}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              adminViewEnabled
                ? 'bg-[var(--signal-amber-soft)] text-[var(--signal-amber)] border border-[var(--signal-amber-border)]'
                : 'text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {adminViewEnabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {adminViewEnabled ? 'Admin view ON' : 'Switch to admin view'}
          </button>
        )}
      </div>
    </aside>
  );
}
