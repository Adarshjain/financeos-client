import { describe, expect, it } from 'vitest';

import { JOBS_POLL_ACTIVE_MS, JOBS_POLL_IDLE_MS, jobsPollInterval } from './jobsPollInterval';

describe('jobsPollInterval', () => {
  it('polls slowly with no list or only finished jobs', () => {
    expect(jobsPollInterval(undefined)).toBe(JOBS_POLL_IDLE_MS);
    expect(jobsPollInterval([{ status: 'SUCCEEDED' }, { status: 'FAILED' }])).toBe(JOBS_POLL_IDLE_MS);
  });

  it('polls fast while a job is pending or running', () => {
    expect(jobsPollInterval([{ status: 'SUCCEEDED' }, { status: 'PENDING' }])).toBe(JOBS_POLL_ACTIVE_MS);
    expect(jobsPollInterval([{ status: 'RUNNING' }])).toBe(JOBS_POLL_ACTIVE_MS);
  });

  it('polls fast right after a job was enqueued here', () => {
    expect(jobsPollInterval([], true)).toBe(JOBS_POLL_ACTIVE_MS);
  });
});
