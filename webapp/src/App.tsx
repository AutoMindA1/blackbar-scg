import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseIntake from './pages/CaseIntake';
import CaseResearch from './pages/CaseResearch';
import CaseDrafting from './pages/CaseDrafting';
import CaseQA from './pages/CaseQA';
import CaseExport from './pages/CaseExport';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cases" element={<Dashboard />} />
          <Route path="/cases/:id/intake" element={<CaseIntake />} />
          <Route path="/cases/:id/research" element={<CaseResearch />} />
          <Route path="/cases/:id/drafting" element={<CaseDrafting />} />
          <Route path="/cases/:id/qa" element={<CaseQA />} />
          <Route path="/cases/:id/export" element={<CaseExport />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
