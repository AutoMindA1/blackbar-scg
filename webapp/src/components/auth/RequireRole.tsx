import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

type Role = 'operator' | 'expert' | 'admin';

interface RequireRoleProps {
  role: Role | Role[];
  children: ReactNode;
}

export default function RequireRole({ role, children }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(role)
    ? role.includes(user.role as Role)
    : user.role === role;

  if (!allowed) return <Navigate to="/403" replace />;

  return <>{children}</>;
}
