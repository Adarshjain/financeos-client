import createFetchClient, { type Middleware } from 'openapi-fetch';

import { getFaro } from '@/instrumentation-client';
import type { paths } from '@/lib/api/schema';
import type { ErrorResponse } from '@/lib/api/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public response: ErrorResponse,
  ) {
    super(response.message);
    this.name = 'ApiError';
  }
}

const clientRequestTimings = new WeakMap<Request, number>();

const browserMiddleware: Middleware = {
  async onRequest({ request }) {
    // Record start time locally for Faro measurement
    clientRequestTimings.set(request, performance.now());

    // Attach unique client request ID
    const requestId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    request.headers.set('X-Request-Id', requestId);

    // Only set Content-Type to application/json if body is not FormData and not already set
    if (request.body && !(request.body instanceof FormData)) {
      if (!request.headers.has('Content-Type')) {
        request.headers.set('Content-Type', 'application/json');
      }
    }

    return request;
  },

  async onResponse({ request, response }) {
    const start = clientRequestTimings.get(request);
    const durationMs = start !== undefined ? Math.round(performance.now() - start) : undefined;

    // Report to Grafana Faro if available
    const faro = getFaro();
    if (faro && durationMs !== undefined) {
      const url = new URL(request.url);
      faro.api.pushMeasurement(
        { type: 'api-call', values: { durationMs } },
        { context: { endpoint: url.pathname, method: request.method, status: String(response.status) } }
      );
    }

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('financeos:auth-expired'));
      }
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
        };
      }
      throw new ApiError(response.status, errorResponse);
    }

    return response;
  },
};

export const api = createFetchClient<paths>({
  baseUrl: '/',
  fetch: (req: Request) => fetch(req),
});

api.use(browserMiddleware);
