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


export const serverApi = createFetchClient<paths>({
  baseUrl: API_BASE,
  cache: 'no-store',
  fetch: (req: Request) => fetch(req),
});

serverApi.use(serverMiddleware);
