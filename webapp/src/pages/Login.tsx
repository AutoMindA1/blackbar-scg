import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import BearMark from '../components/shared/BearMark';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
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
    <div className="min-h-screen flex bg-[var(--color-bg-primary)]">
      {/* Left panel — Full bear hero (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <BearMark variant="hero" size="full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-sm text-[var(--color-text-muted)] italic">
            "Every report is a controlled demolition"
          </p>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Bear watermark on mobile (hidden on large screens) */}
        <div className="lg:hidden">
          <BearMark variant="watermark" opacity={0.12} />
        </div>

        <div className="w-full max-w-sm relative z-10 page-enter">
          {/* Brand */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <BearMark variant="icon" size="lg" />
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-[0.06em] text-[var(--color-text-primary)] mb-1">
              Black<span className="text-[var(--color-accent-primary)]">Bar</span>
            </h1>
            <p className="font-display text-sm italic text-[var(--color-accent-primary)]">Savage Wins</p>
          </div>

          {/* Form */}
          <div className="glass-elevated rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                  placeholder="you@swainston.com" required
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-3 pr-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-primary)] transition-colors"
                    placeholder="Enter password" required
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-xs">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 page-enter">
                  <p className="text-[var(--color-error)] text-xs">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Sign In
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)]">AI-Assisted Expert Report Drafting</p>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Swainston Consulting Group</p>
          </div>
        </div>
      </div>
    </div>
  );
}
