import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BearMark from '../components/shared/BearMark';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center relative">
      <BearMark variant="hero" size="full" opacity={0.30} className="absolute inset-0" />
      <div className="relative z-10 text-center page-enter max-w-md px-6">
        <h1 className="text-6xl font-bold text-[var(--color-text-primary)] mb-4">403</h1>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          You don't have access to this surface
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Admin tools are gated. Ask Caleb if you need a key.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
