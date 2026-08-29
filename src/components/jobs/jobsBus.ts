/**
 * Tiny in-tab channel for "a job was just enqueued".
 *
 * This replaces the old app-wide JobsProvider poll: nothing here talks to the
 * server, and nothing runs on pages that render no job UI. A flow that enqueues
 * a job calls `emitJobStarted(jobId)`; every mounted JobsPanel refetches at once
 * and then live-polls itself until the job settles.
 *
 * Directive-free on purpose (like jobUtils) so it can be imported from either
 * side of the server/client boundary.
 */
type JobStartedListener = (jobId: string) => void;

const listeners = new Set<JobStartedListener>();

export function emitJobStarted(jobId: string): void {
  if (!jobId) return;
  for (const listener of Array.from(listeners)) {
    listener(jobId);
  }
}

export function subscribeJobStarted(listener: JobStartedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
