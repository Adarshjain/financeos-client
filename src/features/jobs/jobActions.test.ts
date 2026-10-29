import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: m.get, POST: m.post } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { cancelJob, loadJob, loadJobs, retryJob } from './jobActions';

beforeEach(() => vi.clearAllMocks());

describe('job actions', () => {
  it('loadJob reads one job', async () => {
    m.get.mockResolvedValue({ data: { id: 'j1', status: 'RUNNING' } });
    expect(await loadJob('j1')).toEqual({ success: true, data: { id: 'j1', status: 'RUNNING' } });
    expect(m.get).toHaveBeenCalledWith('/api/v1/jobs/{id}', { params: { path: { id: 'j1' } } });
  });

  it('loadJobs passes the query through and returns null for no body', async () => {
    m.get.mockResolvedValue({ data: { content: [] } });
    expect(await loadJobs({ page: 0, size: 5 })).toEqual({ success: true, data: { content: [] } });
    expect(m.get).toHaveBeenCalledWith('/api/v1/jobs', { params: { query: { page: 0, size: 5 } } });
    m.get.mockResolvedValue({ data: undefined });
    expect(await loadJobs({})).toEqual({ success: true, data: null });
  });

  it('cancelJob and retryJob post to the job and return it', async () => {
    m.post.mockResolvedValue({ data: { id: 'j1' } });
    expect(await cancelJob('j1')).toEqual({ success: true, data: { id: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/jobs/{id}/cancel', { params: { path: { id: 'j1' } } });
    expect(await retryJob('j1')).toEqual({ success: true, data: { id: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/jobs/{id}/retry', { params: { path: { id: 'j1' } } });
  });

  it('reports a failure instead of throwing', async () => {
    m.post.mockRejectedValue(new Error('down'));
    const res = await cancelJob('j1');
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.message).toBe("Couldn't cancel the job. Try again.");
  });
});
