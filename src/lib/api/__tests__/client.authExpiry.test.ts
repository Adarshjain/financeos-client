import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { currentSessionGeneration, markSessionRenewed } from '@/lib/authExpiry';

describe('client auth-expired (browserMiddleware)', () => {
  let api: (typeof import('@/lib/api/client'))['api'];
  const originalFetch = global.fetch;
  const OriginalRequest = globalThis.Request;

  beforeAll(async () => {
    globalThis.Request = class extends OriginalRequest {
      constructor(input: string | URL, init?: RequestInit) {
        if (typeof input === 'string' && input.startsWith('/')) input = 'http://localhost' + input;
        super(input, init);
      }
    } as typeof Request;
    api = (await import('@/lib/api/client')).api;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const unauthorized = () =>
    new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'x' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  it('raises auth-expired for a 401, but not when the request started before the visitor signed in again', async () => {
    const heard = vi.fn();
    window.addEventListener('financeos:auth-expired', heard);

    global.fetch = vi.fn().mockResolvedValue(unauthorized());
    await api.GET('/api/v1/accounts').catch(() => undefined);
    expect(heard).toHaveBeenCalledTimes(1);

    // In flight while the sign-in completes: its 401 is about the old cookie.
    let answer!: (r: Response) => void;
    global.fetch = vi.fn().mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    const stale = api.GET('/api/v1/accounts').catch(() => undefined);
    const before = currentSessionGeneration();
    markSessionRenewed();
    expect(currentSessionGeneration()).toBe(before + 1);
    answer(unauthorized());
    await stale;
    expect(heard).toHaveBeenCalledTimes(1);

    // A request made after the sign-in is a real expiry.
    global.fetch = vi.fn().mockResolvedValue(unauthorized());
    await api.GET('/api/v1/accounts').catch(() => undefined);
    expect(heard).toHaveBeenCalledTimes(2);
    window.removeEventListener('financeos:auth-expired', heard);
  });
});
