import { cookies, headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import createFetchClient, { type Middleware } from 'openapi-fetch';

import { ApiError } from '@/lib/api/client';
import type { paths } from '@/lib/api/schema';
import type { ErrorResponse } from '@/lib/api/types';
import { isInServerAction, redirectToLock } from '@/lib/appLockServer';
import { logger } from '@/lib/observability/logger';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:6969';

const serverRequestTimings = new WeakMap<Request, number>();

const serverMiddleware: Middleware = {
  async onRequest({ request }) {
    let sessionCookie: string | undefined;
    let deviceCookie: string | undefined;
    try {
      const cookieStore = await cookies();
      sessionCookie = cookieStore.get('FINANCEOS_SESSION')?.value;
      deviceCookie = cookieStore.get('FINANCEOS_DEVICE')?.value;
    } catch (error) {
      unstable_rethrow(error);
      // Outside request context
    }

    let requestId: string | undefined;
    let sessionId: string | undefined;
    try {
      const headerStore = await headers();
      requestId = headerStore.get('x-request-id') ?? undefined;
      sessionId = headerStore.get('x-session-id') ?? undefined;
    } catch (error) {
      unstable_rethrow(error);
      // Outside request context
    }

    if (sessionCookie) {
      request.headers.set(
        'Cookie',
        deviceCookie
          ? `FINANCEOS_SESSION=${sessionCookie}; FINANCEOS_DEVICE=${deviceCookie}`
          : `FINANCEOS_SESSION=${sessionCookie}`,
      );
    }
    if (requestId) {
      request.headers.set('X-Request-Id', requestId);
    }
    if (sessionId) {
      request.headers.set('X-Session-Id', sessionId);
    }

    if (request.body && !(request.body instanceof FormData)) {
      if (!request.headers.has('Content-Type')) {
        request.headers.set('Content-Type', 'application/json');
      }
    }

    // Attach start time for latency tracking locally
    serverRequestTimings.set(request, Date.now());

    return request;
  },

  async onResponse({ request, response }) {
    const url = new URL(request.url);
    const startMs = serverRequestTimings.get(request) ?? Date.now();
    const durationMs = Date.now() - startMs;
    const requestId = request.headers.get('X-Request-Id') ?? undefined;
    const sessionId = request.headers.get('X-Session-Id') ?? undefined;

    logger.log(response.ok ? 'INFO' : 'WARN', 'client.api.call', {
      endpoint: url.pathname,
      method: request.method,
      status: response.status,
      durationMs,
      requestId,
      sessionId,
    });

    // Locked: a page render or route handler goes to the lock screen; a server action returns the error as data.
    if (response.status === 423 && !(await isInServerAction())) {
      await redirectToLock();
    }

    if (!response.ok) {
      let errorResponse: ErrorResponse;
      try {
        errorResponse = await response.clone().json();
      } catch {
        errorResponse = {
          code: 'UNKNOWN_ERROR',
          message: `Request failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }
      if (!errorResponse.requestId && requestId) {
        errorResponse.requestId = requestId;
      }
      throw new ApiError(response.status, errorResponse, { requestId, endpoint: url.pathname, method: request.method });
    }

    return response;
  },
};


const GET_RETRY_DELAY_MS = 2000;
const GET_RETRY_STATUSES = new Set([502, 503, 504]);

/**
 * One retry after a short wait for a GET that hit a restarting API (502/503/504 or a network error), so a deploy
 * restart does not surface as a failure. Other methods and statuses, and aborted requests, are never retried.
 */
async function fetchWithGetRetry(req: Request): Promise<Response> {
  if (req.method !== 'GET') return fetch(req);
  const retry = req.clone();
  let response: Response;
  try {
    response = await fetch(req);
  } catch (error) {
    if (req.signal.aborted || !(error instanceof TypeError)) throw error;
    await waitUnlessAborted(req.signal);
    if (req.signal.aborted) throw error;
    return fetch(retry);
  }
  if (!GET_RETRY_STATUSES.has(response.status) || req.signal.aborted) return response;
  await waitUnlessAborted(req.signal);
  if (req.signal.aborted) return response;
  await response.body?.cancel().catch(() => {});
  return fetch(retry);
}

/** The retry wait, cut short when the caller aborts. */
function waitUnlessAborted(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, GET_RETRY_DELAY_MS);
    signal.addEventListener('abort', done, { once: true });
  });
}

export const serverApi = createFetchClient<paths>({
  baseUrl: API_BASE,
  cache: 'no-store',
  fetch: fetchWithGetRetry,
});

serverApi.use(serverMiddleware);
