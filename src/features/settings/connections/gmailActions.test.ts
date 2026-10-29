import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: m.get, POST: m.post, PUT: m.put, DELETE: m.del } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  archiveGmailAttention,
  assignGmailAttention,
  createGmailSender,
  deleteGmailSender,
  disconnectGmail,
  loadGmailAttention,
  loadGmailConnections,
  loadGmailSenders,
  retryGmailAttention,
  startGmailOAuth,
  syncGmail,
  unarchiveGmailAttention,
  updateGmailSender,
} from './gmailActions';

beforeEach(() => {
  vi.clearAllMocks();
  m.get.mockResolvedValue({ data: undefined });
  m.post.mockResolvedValue({ data: { jobId: 'j1' } });
  m.put.mockResolvedValue({ data: { id: 's1' } });
  m.del.mockResolvedValue({ data: undefined });
});

describe('gmail reads', () => {
  it('lists default to an empty array', async () => {
    expect(await loadGmailConnections()).toEqual({ success: true, data: [] });
    expect(await loadGmailSenders()).toEqual({ success: true, data: [] });
    expect(m.get).toHaveBeenCalledWith('/api/v1/gmail/connections');
    expect(m.get).toHaveBeenCalledWith('/api/v1/gmail/senders');
  });

  it('attention sends the query and defaults to null', async () => {
    const query = { page: 1, size: 10, includeRetryable: false, archived: true };
    expect(await loadGmailAttention(query)).toEqual({ success: true, data: null });
    expect(m.get).toHaveBeenCalledWith('/api/v1/gmail/attention', { params: { query } });
  });

  it('passes the server rows through', async () => {
    m.get.mockResolvedValue({ data: [{ id: 'c1' }] });
    expect(await loadGmailConnections()).toEqual({ success: true, data: [{ id: 'c1' }] });
  });

  it('reports a failure with the action fallback', async () => {
    m.get.mockRejectedValue(new Error('down'));
    const res = await loadGmailConnections();
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.message).toBe("Couldn't load the mailboxes. Try again.");
  });
});

describe('gmail writes', () => {
  it('starts OAuth and sync', async () => {
    m.get.mockResolvedValue({ data: { authorizationUrl: 'u' } });
    expect(await startGmailOAuth()).toEqual({ success: true, data: { authorizationUrl: 'u' } });
    expect(m.get).toHaveBeenCalledWith('/api/v1/gmail/oauth/start');
    expect(await syncGmail()).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/sync');
  });

  it('disconnect, archive, unarchive and sender delete resolve with no data', async () => {
    expect(await disconnectGmail('c1')).toEqual({ success: true, data: undefined });
    expect(m.del).toHaveBeenCalledWith('/api/v1/gmail/connections/{id}', { params: { path: { id: 'c1' } } });
    expect(await archiveGmailAttention('l1')).toEqual({ success: true, data: undefined });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/attention/{ledgerId}/archive', { params: { path: { ledgerId: 'l1' } } });
    expect(await unarchiveGmailAttention('l1')).toEqual({ success: true, data: undefined });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/attention/{ledgerId}/unarchive', { params: { path: { ledgerId: 'l1' } } });
    expect(await deleteGmailSender('s1')).toEqual({ success: true, data: undefined });
    expect(m.del).toHaveBeenCalledWith('/api/v1/gmail/senders/{id}', { params: { path: { id: 's1' } } });
  });

  it('retry and assign return the server answer', async () => {
    expect(await retryGmailAttention('l1')).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/attention/{ledgerId}/retry', { params: { path: { ledgerId: 'l1' } } });
    expect(await assignGmailAttention('l1', { accountId: 'a1' })).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/attention/{ledgerId}/assign', {
      params: { path: { ledgerId: 'l1' } },
      body: { accountId: 'a1' },
    });
  });

  it('creates and updates a sender', async () => {
    const body = { email: 'a@b.c' } as never;
    expect(await createGmailSender(body)).toEqual({ success: true, data: { jobId: 'j1' } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/gmail/senders', { body });
    expect(await updateGmailSender('s1', body)).toEqual({ success: true, data: { id: 's1' } });
    expect(m.put).toHaveBeenCalledWith('/api/v1/gmail/senders/{id}', { params: { path: { id: 's1' } }, body });
  });

  it('reports a failure instead of throwing', async () => {
    m.post.mockRejectedValue(new Error('down'));
    const res = await syncGmail();
    expect(res.success).toBe(false);
  });
});
