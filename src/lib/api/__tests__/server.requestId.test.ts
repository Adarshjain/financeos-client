import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-session' }),
  }),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-request-id') return 'server-context-req-id';
      if (name.toLowerCase() === 'x-session-id') return 'server-context-sess-id';
      return null;
    }),
  }),
}));

vi.mock('next/navigation', () => ({
  unstable_rethrow: vi.fn(),
}));

describe('server.requestId (serverMiddleware)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('attaches incoming request/session IDs to outbound request and parses ApiError on failure', async () => {
    let capturedHeaders: Headers | undefined;
    global.fetch = vi.fn().mockImplementation((req: Request) => {
      capturedHeaders = req.headers;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: 'NOT_FOUND',
            message: 'User not found',
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    });

    let caughtError: unknown;
    try {
      await serverApi.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(capturedHeaders?.get('X-Request-Id')).toBe('server-context-req-id');
    expect(capturedHeaders?.get('X-Session-Id')).toBe('server-context-sess-id');
    expect(capturedHeaders?.get('Cookie')).toBe('FINANCEOS_SESSION=mock-session');

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as ApiError;
    expect(err.status).toBe(404);
    expect(err.requestId).toBe('server-context-req-id');
    expect(err.response.requestId).toBe('server-context-req-id');
  });

  it('handles non-JSON error response from server path', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      }),
    );

    let caughtError: unknown;
    try {
      await serverApi.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as ApiError;
    expect(err.status).toBe(500);
    expect(err.response.code).toBe('UNKNOWN_ERROR');
    expect(err.requestId).toBe('server-context-req-id');
  });
});
