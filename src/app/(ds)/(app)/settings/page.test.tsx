import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ requireAuth: vi.fn(), redirectToSignIn: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
const status = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ appLockApi: { status } }));
vi.mock('@/features/settings/profile/ProfileScreen', () => ({ ProfileScreen: () => null }));

import { ApiError } from '@/lib/api/client';

import DsSettingsProfilePage from './page';

beforeEach(() => vi.resetAllMocks());

describe('Settings profile page', () => {
  it('asks for the session and the app-lock status together', async () => {
    auth.requireAuth.mockReturnValue(new Promise(() => undefined));
    status.mockReturnValue(new Promise(() => undefined));
    void DsSettingsProfilePage();
    await Promise.resolve();
    expect(auth.requireAuth).toHaveBeenCalled();
    expect(status).toHaveBeenCalled();
  });

  it('hands both to the screen', async () => {
    auth.requireAuth.mockResolvedValue({ email: 'a@b.c' });
    status.mockResolvedValue({ enabled: false });
    const element = await DsSettingsProfilePage();
    expect(element.props).toMatchObject({ user: { email: 'a@b.c' }, appLock: { enabled: false } });
  });

  it('sends a signed-out visitor to sign in when the status call is a 401', async () => {
    auth.requireAuth.mockResolvedValue({ email: 'a@b.c' });
    status.mockRejectedValue(new ApiError(401, { code: 'U', message: 'no', timestamp: 'x' }));
    auth.redirectToSignIn.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(DsSettingsProfilePage()).rejects.toThrow('NEXT_REDIRECT');
  });
});
