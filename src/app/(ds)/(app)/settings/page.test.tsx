import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ requireAuth: vi.fn(), redirectToSignIn: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
const api = vi.hoisted(() => ({
  status: vi.fn(),
  getAttentionTotal: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/lib/apiClient', () => ({
  appLockApi: { status: api.status },
  gmailApi: { getAttentionTotal: api.getAttentionTotal },
  llmKeysApi: { list: api.list },
}));
vi.mock('@/features/settings/SettingsMain', () => ({ SettingsMain: () => null }));

import { ApiError } from '@/lib/api/client';

import DsSettingsPage from './page';

const user = { email: 'a@b.c' };

beforeEach(() => {
  vi.resetAllMocks();
  auth.requireAuth.mockResolvedValue(user);
  api.status.mockResolvedValue({ armed: false });
  api.getAttentionTotal.mockResolvedValue(4);
  api.list.mockResolvedValue([{}, {}]);
});

describe('Settings main page', () => {
  it('hands the user, app lock status and streamed counts to the page', async () => {
    const element = await DsSettingsPage();
    expect(element.props.user).toBe(user);
    expect(element.props.appLock).toEqual({ armed: false });
    await expect(element.props.values.attentionCount).resolves.toBe(4);
    await expect(element.props.values.aiKeyCount).resolves.toBe(2);
  });

  it('hides a count whose request failed instead of failing the page', async () => {
    api.getAttentionTotal.mockRejectedValue(new Error('x'));
    api.list.mockRejectedValue(new ApiError(500, { code: 'X', message: 'no', timestamp: 'x' }));
    const element = await DsSettingsPage();
    await expect(element.props.values.attentionCount).resolves.toBeUndefined();
    await expect(element.props.values.aiKeyCount).resolves.toBeUndefined();
  });

  it('sends a signed-out visitor to sign in when the app lock call is a 401', async () => {
    api.status.mockRejectedValue(new ApiError(401, { code: 'U', message: 'no', timestamp: 'x' }));
    auth.redirectToSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(DsSettingsPage()).rejects.toThrow('NEXT_REDIRECT');
  });
});
