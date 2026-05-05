/**
 * Auto-advance toast — fixed top-right, 4s auto-dismiss handled by the parent.
 * Used when Pattern C decides no human is needed for a stage transition.
 *
 * Parent owns the timer (via setTimeout + clearAutoAdvanceEvent) so this stays
 * a pure presentation component — no internal state, no useEffect.
 */
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  message: string | null;
}

export default function PatternCToast({ message }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="pattern-c-toast"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg max-w-sm"
          style={{
            background: 'var(--noir-2)',
            border: '1px solid var(--signal-amber-border)',
            borderLeft: '2px solid var(--signal-amber)',
          }}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--color-text-primary)]">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
