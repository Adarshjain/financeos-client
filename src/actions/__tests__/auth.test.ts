import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/test/next-mocks';

import { handleGoogleCallbackAction, login, logout, signup, startGoogleSSO } from '@/actions/auth';
import { authApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  authApi: {
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    startGoogleAuth: vi.fn(),
    handleGoogleCallback: vi.fn(),
  },
}));

describe('auth server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signup calls authApi.signup', async () => {
    vi.mocked(authApi.signup).mockResolvedValue({ id: 'u1', email: 'test@example.com' } as any);

    const form = new FormData();
    form.append('email', 'test@example.com');
    form.append('password', 'password123');

    const res = await signup(null, form);
    expect(res.success).toBe(true);
  });

  it('login calls authApi.login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com' },
      sessionCookie: 'sess123',
    } as any);

    const form = new FormData();
    form.append('email', 'test@example.com');
    form.append('password', 'password123');

    const res = await login(null, form);
    expect(res.success).toBe(true);
  });

  it('logout calls authApi.logout', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    await logout();
    expect(authApi.logout).toHaveBeenCalled();
  });

  it('startGoogleSSO and handleGoogleCallbackAction call authApi helpers', async () => {
    vi.mocked(authApi.startGoogleAuth).mockResolvedValue({ authorizationUrl: 'http://auth' } as any);
    vi.mocked(authApi.handleGoogleCallback).mockResolvedValue({
      user: { id: 'u1' },
      sessionCookie: 'sess123',
    } as any);

    const res1 = await startGoogleSSO();
    expect(res1.success).toBe(true);

    const res2 = await handleGoogleCallbackAction('code', 'state', undefined);
    expect(res2.success).toBe(true);
  });
});
