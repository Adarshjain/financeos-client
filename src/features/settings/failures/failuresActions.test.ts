import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  listGmail: vi.fn(),
  listJobs: vi.fn(),
  getGmail: vi.fn(),
  getJob: vi.fn(),
  retryGmail: vi.fn(),
  skipGmail: vi.fn(),
  retryJob: vi.fn(),
  dismissJob: vi.fn(),
  retryAll: vi.fn(),
}));
vi.mock('@/lib/apiClient', async () => ({
  failuresApi: api,
  ApiError: (await import('@/lib/api/client')).ApiError,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  dismissJob,
  loadFailedEmails,
  loadFailedJobs,
  retryAllFailures,
  retryEmail,
  retryJob,
  skipEmail,
} from './failuresActions';
import { STALE_MESSAGE } from './failuresModel';

const conflict = () => new ApiError(409, { code: 'NOT_FAILED', message: 'Not failed', timestamp: 't' });

beforeEach(() => vi.clearAllMocks());

describe('failures actions', () => {
  it('lists emails 20 at a time, asking for Skipped only when filtered', async () => {
    api.listGmail.mockResolvedValue({ content: [] });
    await loadFailedEmails('failed', 1);
    expect(api.listGmail).toHaveBeenCalledWith({ page: 1, size: 20, status: undefined });
    await loadFailedEmails('skipped', 0);
    expect(api.listGmail).toHaveBeenLastCalledWith({ page: 0, size: 20, status: 'SKIPPED_BY_ADMIN' });
  });

  it('lists jobs with the dismissed flag', async () => {
    api.listJobs.mockResolvedValue({ content: [] });
    await loadFailedJobs(true, 2);
    expect(api.listJobs).toHaveBeenCalledWith({ page: 2, size: 20, includeDismissed: true });
  });

  it('calls the retry, skip, dismiss and retry-all endpoints', async () => {
    api.retryGmail.mockResolvedValue({ jobId: 'J' });
    api.skipGmail.mockResolvedValue(undefined);
    api.retryJob.mockResolvedValue({ jobId: 'J2' });
    api.dismissJob.mockResolvedValue(undefined);
    api.retryAll.mockResolvedValue({ affected: 1, skipped: 0, jobsEnqueued: 1 });
    expect(await retryEmail('L')).toEqual({ success: true, data: { jobId: 'J' } });
    expect((await skipEmail('L', 'why')).success).toBe(true);
    expect(api.skipGmail).toHaveBeenCalledWith('L', 'why');
    expect((await retryJob('J')).success).toBe(true);
    expect((await dismissJob('J', 'no')).success).toBe(true);
    expect(api.dismissJob).toHaveBeenCalledWith('J', 'no');
    expect((await retryAllFailures('gmail')).success).toBe(true);
    expect(api.retryAll).toHaveBeenCalledWith('gmail');
  });

  it('maps a 409 to the plain message and keeps the status', async () => {
    api.retryGmail.mockRejectedValue(conflict());
    api.skipGmail.mockRejectedValue(conflict());
    api.retryJob.mockRejectedValue(conflict());
    api.dismissJob.mockRejectedValue(conflict());
    for (const r of [await retryEmail('L'), await skipEmail('L', 'x'), await retryJob('J'), await dismissJob('J', 'x')]) {
      expect(r).toMatchObject({ success: false, status: 409, error: { message: STALE_MESSAGE } });
    }
  });

  it('keeps other failures as they are', async () => {
    api.retryJob.mockRejectedValue(new ApiError(500, { code: 'X', message: 'boom', timestamp: 't' }));
    expect(await retryJob('J')).toMatchObject({ success: false, status: 500, error: { message: 'boom' } });
  });
});
