/**
 * Companion to the inline [AGENT BLIND] flag (see ImagePreviewModal). Where
 * AGENT BLIND signals "agent cannot reason over this content," AGENT REASONING
 * signals "this surface is backed by agent reasoning" — used to mark AI-generated
 * findings, summaries, or analysis on Mariz-tier surfaces so trust is explicit.
 */
import type { ReactNode } from 'react';

interface AgentReasoningPillProps {
  children?: ReactNode;
}

export default function AgentReasoningPill({ children = 'AGENT REASONING' }: AgentReasoningPillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono tracking-wider bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/30"
      role="note"
      aria-label="Agent reasoning"
    >
      {children}
    </span>
  );
}
