import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-60 bg-base border-r border-border flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-accent-primary" />
          <h1 className="font-display text-xl tracking-tight">
            <span className="text-text-primary">Black</span>
            <span className="text-accent-primary">Bar</span>
          </h1>
        </div>
        <p className="font-display text-xs italic text-accent-primary mt-1">Savage Wins</p>
        <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] mt-0.5">Swainston Consulting Group</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/dashboard" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-accent-glow text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`
        }>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/cases" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-accent-glow text-accent-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`
        }>
          <FolderOpen className="w-4 h-4" />
          Cases
        </NavLink>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">{user?.name}</p>
            <p className="text-xs text-text-muted capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-text-muted hover:text-error rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
