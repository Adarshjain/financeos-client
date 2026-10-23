import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u) }));
const status = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('x');
    }
  },
  appLockApi: { status: () => status() },
}));
const redirectToSignIn = vi.fn(async () => {
  throw new Error('REDIRECT:/ds/login');
});
vi.mock('@/lib/auth', () => ({ redirectToSignIn: () => redirectToSignIn() }));
vi.mock('@/features/appLock/LockScreen', () => ({ LockScreen: () => null }));

import { ApiError } from '@/lib/apiClient';

import DsLockedPage from './page';

const locked = { armed: true, locked: true, heartbeatSeconds: 15, rpId: 'localhost' };

beforeEach(() => vi.clearAllMocks());

describe('/ds/locked page', () => {
  it('renders the lock screen while locked, with the validated from', async () => {
    status.mockResolvedValue(locked);
    const el = (await DsLockedPage({ searchParams: Promise.resolve({ from: '/ds/loans' }) })) as { props: { from: string } };
    expect(el.props.from).toBe('/ds/loans');
  });

  it('falls back to the dashboard (still Legacy) for an unsafe from', async () => {
    status.mockResolvedValue(locked);
    const el = (await DsLockedPage({ searchParams: Promise.resolve({ from: '//evil.com' }) })) as { props: { from: string } };
    expect(el.props.from).toBe('/dashboard');
  });

  it('ignores a repeated from parameter instead of failing', async () => {
    status.mockResolvedValue(locked);
    const el = (await DsLockedPage({ searchParams: Promise.resolve({ from: ['/ds/a', '/ds/b'] }) })) as { props: { from: string } };
    expect(el.props.from).toBe('/dashboard');
  });

  it('goes straight to where they were headed when nothing is locked', async () => {
    status.mockResolvedValue({ ...locked, locked: false });
    await expect(DsLockedPage({ searchParams: Promise.resolve({ from: '/ds/loans' }) })).rejects.toThrow('REDIRECT:/ds/loans');
  });

  it('goes to sign-in when the session is gone', async () => {
    status.mockRejectedValue(new (ApiError as unknown as new (status: number) => Error)(401));
    await expect(DsLockedPage({})).rejects.toThrow('REDIRECT:/ds/login');
  });
});
