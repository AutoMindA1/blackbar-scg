import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Sidebar from './Sidebar';

export default function AppShell() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep">
        <div className="animate-pulse font-display text-xl text-accent-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-deep">
      <Sidebar />
      <main className="ml-60 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
