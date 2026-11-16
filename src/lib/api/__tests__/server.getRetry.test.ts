import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock('next/navigation', () => ({
  unstable_rethrow: vi.fn(),
}));

const ok = () => new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
const status = (code: number) =>
  new Response(JSON.stringify({ code: 'X', message: 'm' }), { status: code, headers: { 'Content-Type': 'application/json' } });

describe('serverApi GET retry', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it.each([502, 503, 504])('retries a GET once after %i and returns the second answer', async (code) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(code)).mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const promise = serverApi.GET('/api/v1/accounts');
    await vi.advanceTimersByTimeAsync(2100);
    const result = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.response.status).toBe(200);
  });

  it('retries a GET once after a network error', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const promise = serverApi.GET('/api/v1/accounts');
    await vi.advanceTimersByTimeAsync(2100);
    await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails with the final 502 when the retry also fails, retrying only once', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(status(502)));
    global.fetch = fetchMock;
    const promise = serverApi.GET('/api/v1/accounts').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const error = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it.each([400, 404, 500])('does not retry a GET after %i', async (code) => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(status(code)));
    global.fetch = fetchMock;
    const error = await serverApi.GET('/api/v1/accounts').catch((e: unknown) => e);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((error as ApiError).status).toBe(code);
  });

  it('never retries a POST', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(status(502)));
    global.fetch = fetchMock;
    const error = await serverApi.POST('/api/v1/accounts', { body: {} as never }).catch((e: unknown) => e);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((error as ApiError).status).toBe(502);
  });

  it('does not retry an aborted GET', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new TypeError('aborted'));
    });
    global.fetch = fetchMock;
    const promise = serverApi.GET('/api/v1/accounts', { signal: controller.signal }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
