import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import BearMark from '../components/shared/BearMark';

/**
 * Login — UI_REFERENCE_v1.html §03 "The front door." One card. One action.
 * Bear shows up once, in brand scale. No social login theater, no split-
 * screen hero, no "Savage Wins" tagline (§03 keeps the chrome quiet).
 */

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--noir-0)',
  border: '1px solid var(--noir-3)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  color: 'var(--bone)',
  fontFamily: 'var(--font-ui-v2)',
  fontSize: '0.9375rem',
  transition: 'border-color var(--duration-base) var(--ease-forensic), box-shadow var(--duration-base) var(--ease-forensic)',
};

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
    setError('');
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--noir-0)' }}
    >
      <div
        className="v2-surface page-enter"
        style={{ width: '100%', maxWidth: '400px', padding: '40px' }}
      >
        <BearMark variant="icon" size="md" className="mb-6" />

        <h1
          style={{
            fontFamily: 'var(--font-display-v2)',
            fontWeight: 500,
            fontSize: '1.75rem',
            letterSpacing: '-0.02em',
            fontVariationSettings: '"opsz" 80',
            color: 'var(--bone)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Welcome back.
        </h1>
        <p
          className="v2-micro"
          style={{ color: 'var(--bone-muted)', marginBottom: 32 }}
        >
          Swainston Consulting Group · BlackBar v1
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="login-email"
              className="v2-micro"
              style={{ display: 'block', marginBottom: 8, color: 'var(--bone-muted)' }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@swainston.com"
              required
              autoComplete="email"
              style={inputStyle}
              className="v2-focus-ring"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="v2-micro"
              style={{ display: 'block', marginBottom: 8, color: 'var(--bone-muted)' }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 40 }}
                className="v2-focus-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 0,
                  padding: 6,
                  color: 'var(--bone-dim)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color var(--duration-fast) var(--ease-forensic)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--bone)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--bone-dim)'; }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="page-enter"
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--verdict-red-soft)',
                border: '1px solid var(--verdict-red-soft)',
                color: 'var(--verdict-red)',
                fontSize: '0.8125rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="v2-btn v2-btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px 16px',
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
