import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('client.requestId (browserMiddleware)', () => {
  let api: (typeof import('@/lib/api/client'))['api'];
  let ApiError: (typeof import('@/lib/api/client'))['ApiError'];
  const originalFetch = global.fetch;
  const OriginalRequest = globalThis.Request;

  beforeAll(async () => {
    globalThis.Request = class extends OriginalRequest {
      constructor(input: string | URL, init?: RequestInit) {
        if (typeof input === 'string' && input.startsWith('/')) {
          input = 'http://localhost' + input;
        }
        super(input, init);
      }
    } as typeof Request;

    const mod = await import('@/lib/api/client');
    api = mod.api;
    ApiError = mod.ApiError;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('populates ApiError.requestId, endpoint, and method from non-2xx response with headers', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'NOT_FOUND',
          message: 'Item not found',
          requestId: 'res-req-123',
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'res-req-123',
          },
        },
      ),
    );

    let caughtError: unknown;
    try {
      await api.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as InstanceType<typeof ApiError>;
    expect(err.status).toBe(404);
    expect(err.requestId).toBe('res-req-123');
    expect(err.endpoint).toBe('/api/v1/accounts');
    expect(err.method).toBe('GET');
    expect(err.response.requestId).toBe('res-req-123');
  });

  it('fills body.requestId from response header when body lacks it', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'BAD_REQUEST',
          message: 'Invalid parameters',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'header-req-456',
          },
        },
      ),
    );

    let caughtError: unknown;
    try {
      await api.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as InstanceType<typeof ApiError>;
    expect(err.requestId).toBe('header-req-456');
    expect(err.response.requestId).toBe('header-req-456');
  });

  it('falls back to request X-Request-Id when response header is missing', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: 'FORBIDDEN',
            message: 'Forbidden',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              // No X-Request-Id in response headers
            },
          },
        ),
      );
    });

    let caughtError: unknown;
    try {
      await api.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as InstanceType<typeof ApiError>;
    expect(err.requestId).toBeDefined();
    expect(err.requestId?.length).toBe(20);
    expect(err.response.requestId).toBe(err.requestId);
  });

  it('handles non-JSON error body by returning UNKNOWN_ERROR with requestId', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: {
          'Content-Type': 'text/html',
          'X-Request-Id': 'gateway-err-789',
        },
      }),
    );

    let caughtError: unknown;
    try {
      await api.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as InstanceType<typeof ApiError>;
    expect(err.status).toBe(502);
    expect(err.response.code).toBe('UNKNOWN_ERROR');
    expect(err.response.message).toContain('502');
    expect(err.requestId).toBe('gateway-err-789');
    expect(err.response.requestId).toBe('gateway-err-789');
  });

  it('handles fetch network rejection with status 0, NETWORK_ERROR, and request requestId', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let caughtError: unknown;
    try {
      await api.GET('/api/v1/accounts');
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const err = caughtError as InstanceType<typeof ApiError>;
    expect(err.status).toBe(0);
    expect(err.response.code).toBe('NETWORK_ERROR');
    expect(err.response.message).toBe('Failed to fetch');
    expect(err.requestId).toBeDefined();
    expect(err.requestId?.length).toBe(20);
  });
});
