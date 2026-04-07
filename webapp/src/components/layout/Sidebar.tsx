import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import BearMark from '../shared/BearMark';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

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
      <div className="p-4 border-t border-[var(--color-border)]">
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
      </div>
    </aside>
  );
}
