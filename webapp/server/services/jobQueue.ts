/**
 * jobQueue.ts — Dual-mode background job queue for agent processing.
 *
 * When REDIS_URL is set: intended for BullMQ (production).
 * When REDIS_URL is not set: uses an in-process async queue (dev/test).
 *
 * BullMQ is NOT currently installed — the Redis path is a type-only
 * placeholder. All runtime logic uses the in-process fallback.
 */

import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface AgentJobParams {
  caseId: string;
  stage: string;
  feedback?: string;
  userId: string;
  orgId?: string;
}

export interface JobStatus {
  id: string;
  state: 'queued' | 'running' | 'complete' | 'failed';
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Registered processor — set via registerJobProcessor(). */
let processor: ((params: AgentJobParams) => Promise<void>) | null = null;

/** In-process job store. */
const jobs = new Map<string, JobStatus>();

/** Queue of job IDs waiting to run. */
const pending: string[] = [];

/** Job params stashed until the job is picked up. */
const paramStore = new Map<string, AgentJobParams>();

/** Number of jobs currently executing. */
let activeCount = 0;

/** Max concurrent in-process jobs. */
const MAX_CONCURRENCY = 2;

/** Per-job timeout in milliseconds (5 minutes). */
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

/** Whether the queue has been initialised. */
let initialised = false;

/** Whether a shutdown has been requested. */
let shutdownRequested = false;

// ---------------------------------------------------------------------------
// Queue lifecycle
// ---------------------------------------------------------------------------

export async function initQueue(): Promise<void> {
  if (initialised) return;

  if (process.env.REDIS_URL) {
    // Future: initialise BullMQ worker + queue here.
    console.log('[jobQueue] REDIS_URL detected — BullMQ integration not yet wired; falling back to in-process queue');
  } else {
    console.log('[jobQueue] No REDIS_URL — using in-process async queue (max concurrency: 2)');
  }

  initialised = true;
  shutdownRequested = false;
}

export async function shutdownQueue(): Promise<void> {
  shutdownRequested = true;
  console.log('[jobQueue] Shutdown requested — no new jobs will be started');
  // In-process queue: we just stop draining. Running jobs will finish naturally.
}

// ---------------------------------------------------------------------------
// Processor registration
// ---------------------------------------------------------------------------

export function registerJobProcessor(
  fn: (params: AgentJobParams) => Promise<void>,
): void {
  processor = fn;
  console.log('[jobQueue] Job processor registered');
}

// ---------------------------------------------------------------------------
// Enqueue & status
// ---------------------------------------------------------------------------

export async function enqueueAgentJob(params: AgentJobParams): Promise<string> {
  if (!initialised) {
    await initQueue();
  }

  const id = randomUUID();

  const status: JobStatus = {
    id,
    state: 'queued',
  };

  jobs.set(id, status);
  paramStore.set(id, params);
  pending.push(id);

  console.log(`[jobQueue] Job ${id} enqueued — case=${params.caseId} stage=${params.stage}`);

  // Kick the drain loop on the next microtask so the caller gets the ID
  // synchronously before any processing begins.
  setTimeout(() => drain(), 0);

  return id;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const status = jobs.get(jobId);
  if (!status) {
    return { id: jobId, state: 'failed', error: 'Job not found' };
  }
  return { ...status };
}

// ---------------------------------------------------------------------------
// Internal drain loop
// ---------------------------------------------------------------------------

function drain(): void {
  if (shutdownRequested) return;

  while (activeCount < MAX_CONCURRENCY && pending.length > 0) {
    const jobId = pending.shift()!;
    const params = paramStore.get(jobId);
    const status = jobs.get(jobId);

    if (!params || !status) continue;

    activeCount++;
    status.state = 'running';
    status.startedAt = new Date().toISOString();

    console.log(`[jobQueue] Job ${jobId} started (active: ${activeCount}/${MAX_CONCURRENCY})`);

    runJob(jobId, params).finally(() => {
      activeCount--;
      paramStore.delete(jobId);
      // Try to drain more work after a job finishes.
      setTimeout(() => drain(), 0);
    });
  }
}

async function runJob(jobId: string, params: AgentJobParams): Promise<void> {
  const status = jobs.get(jobId);
  if (!status) return;

  if (!processor) {
    status.state = 'failed';
    status.error = 'No job processor registered';
    status.completedAt = new Date().toISOString();
    console.warn(`[jobQueue] Job ${jobId} failed — no processor registered`);
    return;
  }

  // Race the processor against a timeout.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Job timed out after 5 minutes')), JOB_TIMEOUT_MS),
  );

  try {
    await Promise.race([processor(params), timeout]);
    status.state = 'complete';
    status.completedAt = new Date().toISOString();
    console.log(`[jobQueue] Job ${jobId} complete`);
  } catch (err) {
    status.state = 'failed';
    status.error = err instanceof Error ? err.message : String(err);
    status.completedAt = new Date().toISOString();
    console.error(`[jobQueue] Job ${jobId} failed:`, status.error);
  }
}
