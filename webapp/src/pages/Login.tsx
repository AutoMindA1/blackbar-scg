import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const status = (err as { status?: number }).status;
      if (err instanceof TypeError) {
        setError('Cannot reach server — check your connection');
      } else if (status === 401) {
        setError('Invalid email or password');
      } else if (status === 500) {
        setError('Server error — please try again');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-deep flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-primary/5 rounded-full blur-[120px]" />

      <div className="glass rounded-2xl p-8 w-full max-w-sm relative z-10 glow-border">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-10 h-10 text-accent-primary" />
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-1">
            <span className="text-text-primary">Black</span>
            <span className="text-accent-primary">Bar</span>
          </h1>
          <p className="font-display text-sm italic text-accent-primary">Savage Wins</p>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1">Swainston Consulting Group</p>
          <p className="text-xs text-text-secondary mt-3 leading-relaxed">
            From case intake to courtroom-ready rebuttal.<br />
            Four AI agents. One pipeline. Every citation traced.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="you@swainston.com" required />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-error text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign In
          </button>
        </form>

        <p className="text-[10px] text-text-muted text-center mt-6">UAT Environment — 2 hardcoded users</p>
      </div>
    </div>
  );
}
