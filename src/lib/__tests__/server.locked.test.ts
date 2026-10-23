import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u), unstable_rethrow: () => undefined }));

let pathname: string | null = '/ds/loans';
let inAction = false;
let device: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'FINANCEOS_SESSION' ? { value: 'sess' } : name === 'FINANCEOS_DEVICE' && device ? { value: device } : undefined),
  }),
  headers: async () => ({
    get: (k: string) => (k === 'x-pathname' ? pathname : null),
    has: (k: string) => k === 'next-action' && inAction,
  }),
}));
vi.mock('@/lib/observability/logger', () => ({ logger: { log: vi.fn() } }));

import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';

const sent: Request[] = [];
const locked = () =>
  new Response(JSON.stringify({ code: 'APP_LOCKED', message: 'FinanceOS is locked', timestamp: 'now' }), {
    status: 423,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  redirect.mockClear();
  sent.length = 0;
  pathname = '/ds/loans';
  inAction = false;
  device = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      sent.push(req);
      return locked();
    }),
  );
});

describe('serverApi when the app is locked (423)', () => {
  it('redirects a page render to the lock screen, returning to the page', async () => {
    await expect(serverApi.GET('/api/v1/accounts')).rejects.toThrow('REDIRECT:/ds/locked?from=%2Fds%2Floans');
  });

  it('redirects a Legacy page render to the lock screen too', async () => {
    pathname = '/transactions';
    await expect(serverApi.GET('/api/v1/accounts')).rejects.toThrow('REDIRECT:/ds/locked?from=%2Ftransactions');
  });

  it('throws an ApiError(423) inside a server action so the result carries it as data', async () => {
    inAction = true;
    await expect(serverApi.GET('/api/v1/accounts')).rejects.toMatchObject({ status: 423, response: { code: 'APP_LOCKED' } });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('does not loop when it is the lock screen itself that is rendering', async () => {
    pathname = '/ds/locked';
    await expect(serverApi.GET('/api/v1/accounts')).rejects.toBeInstanceOf(ApiError);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('serverApi device cookie', () => {
  it('forwards FINANCEOS_DEVICE next to the session when there is one', async () => {
    device = 'dev-1';
    inAction = true;
    await serverApi.GET('/api/v1/accounts').catch(() => undefined);
    expect(sent[0].headers.get('Cookie')).toBe('FINANCEOS_SESSION=sess; FINANCEOS_DEVICE=dev-1');
  });

  it('sends only the session cookie otherwise', async () => {
    inAction = true;
    await serverApi.GET('/api/v1/accounts').catch(() => undefined);
    expect(sent[0].headers.get('Cookie')).toBe('FINANCEOS_SESSION=sess');
  });
});
