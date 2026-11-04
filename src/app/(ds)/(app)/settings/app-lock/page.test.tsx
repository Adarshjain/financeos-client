import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ redirectToSignIn: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
const status = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ appLockApi: { status } }));

import { ApiError } from '@/lib/api/client';

import DsSettingsAppLockPage from './page';

beforeEach(() => vi.resetAllMocks());

describe('Settings app lock page', () => {
  it('hands the app-lock status to the card', async () => {
    status.mockResolvedValue({ armed: false });
    const element = await DsSettingsAppLockPage();
    expect(element.props).toMatchObject({ status: { armed: false } });
  });

  it('sends a signed-out visitor to sign in when the status call is a 401', async () => {
    status.mockRejectedValue(new ApiError(401, { code: 'U', message: 'no', timestamp: 'x' }));
    auth.redirectToSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(DsSettingsAppLockPage()).rejects.toThrow('NEXT_REDIRECT');
  });
});
