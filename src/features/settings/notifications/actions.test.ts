import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: m.get, POST: m.post, PUT: m.put } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  loadActiveLoans,
  loadNotificationSettings,
  loadPushPublicKey,
  muteAccount,
  muteLoanNotifications,
  removePushDevice,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  updateNotificationSettings,
} from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  m.get.mockResolvedValue({ data: undefined });
  m.post.mockResolvedValue({ data: { ok: 1 } });
  m.put.mockResolvedValue({ data: { ok: 2 } });
});

describe('notification reads', () => {
  it('settings and push key default to null', async () => {
    expect(await loadNotificationSettings()).toEqual({ success: true, data: null });
    expect(await loadPushPublicKey()).toEqual({ success: true, data: null });
    expect(m.get).toHaveBeenCalledWith('/api/v1/notifications/settings');
    expect(m.get).toHaveBeenCalledWith('/api/v1/notifications/push/public-key');
  });

  it('active loans returns the page content, or an empty list', async () => {
    const query = { status: 'active' as const, page: 0, size: 50 };
    expect(await loadActiveLoans(query)).toEqual({ success: true, data: [] });
    expect(m.get).toHaveBeenCalledWith('/api/v1/loans', { params: { query } });
    m.get.mockResolvedValue({ data: { content: [{ id: 'l1' }] } });
    expect(await loadActiveLoans(query)).toEqual({ success: true, data: [{ id: 'l1' }] });
  });

  it('reports a failure instead of throwing', async () => {
    m.get.mockRejectedValue(new Error('down'));
    expect((await loadNotificationSettings()).success).toBe(false);
  });
});

describe('notification writes', () => {
  it('updates settings and manages push subscriptions', async () => {
    expect(await updateNotificationSettings({ sendHour: 9 })).toEqual({ success: true, data: { ok: 2 } });
    expect(m.put).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { sendHour: 9 } });
    const sub = { endpoint: 'e' } as never;
    expect(await subscribePush(sub)).toEqual({ success: true, data: { ok: 1 } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions', { body: sub });
    await unsubscribePush('e');
    expect(m.post).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'e' } });
    await sendTestNotification();
    expect(m.post).toHaveBeenCalledWith('/api/v1/notifications/push/test');
  });

  it('removes a device with its own error copy', async () => {
    expect(await removePushDevice('e')).toEqual({ success: true, data: { ok: 1 } });
    expect(m.post).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'e' } });
    m.post.mockRejectedValue(new Error('down'));
    const res = await removePushDevice('e');
    if (!res.success) expect(res.error.message).toBe("Couldn't remove the device. Try again.");
    expect(res.success).toBe(false);
  });

  it('mutes an account and a loan', async () => {
    await muteAccount('a1', true);
    expect(m.put).toHaveBeenCalledWith('/api/v1/notifications/accounts/{accountId}/mute', {
      params: { path: { accountId: 'a1' } },
      body: { muted: true },
    });
    await muteLoanNotifications('l1', false);
    expect(m.put).toHaveBeenCalledWith('/api/v1/notifications/loans/{loanId}/mute', {
      params: { path: { loanId: 'l1' } },
      body: { muted: false },
    });
  });

  it('reports a failure with the action fallback', async () => {
    m.put.mockRejectedValue(new Error('down'));
    const res = await muteAccount('a1', true);
    expect(res.success).toBe(false);
  });
});
