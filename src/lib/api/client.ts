import createFetchClient, { type Middleware } from 'openapi-fetch';

import { getFaro } from '@/instrumentation-client';
import type { paths } from '@/lib/api/schema';
import type { ErrorResponse } from '@/lib/api/types';

export class ApiError extends Error {
  public requestId?: string;
  public endpoint: string;
  public method: string;

  constructor(
    public status: number,
    public response: ErrorResponse,
    options?: { requestId?: string; endpoint?: string; method?: string },
  ) {
    super(response.message);
    this.name = 'ApiError';
    this.requestId = options?.requestId ?? response.requestId ?? undefined;
    this.endpoint = options?.endpoint ?? '';
    this.method = options?.method ?? 'GET';
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
    const url = new URL(request.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const endpoint = url.pathname;
    const method = request.method;
    const requestId = response.headers.get('X-Request-Id') ?? request.headers.get('X-Request-Id') ?? undefined;

    // Report to Grafana Faro if available
    const faro = getFaro();
    if (faro && durationMs !== undefined) {
      faro.api.pushMeasurement(
        { type: 'api-call', values: { durationMs } },
        { context: { endpoint, method, status: String(response.status) } }
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
          requestId,
        };
      }
      if (!errorResponse.requestId && requestId) {
        errorResponse.requestId = requestId;
      }
      throw new ApiError(response.status, errorResponse, { requestId, endpoint, method });
    }

    return response;
  },

  async onError({ error, request }) {
    if (error instanceof ApiError) {
      throw error;
    }
    const url = new URL(request.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const endpoint = url.pathname;
    const method = request.method;
    const requestId = request.headers.get('X-Request-Id') ?? undefined;

    const errorResponse: ErrorResponse = {
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network error',
      timestamp: new Date().toISOString(),
      requestId,
    };
    throw new ApiError(0, errorResponse, { requestId, endpoint, method });
  },
};

export const api = createFetchClient<paths>({
  baseUrl: '/',
  fetch: (req: Request) => fetch(req),
});

api.use(browserMiddleware);
