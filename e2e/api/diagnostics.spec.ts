import { makeApi } from '../fixtures/api';
import { createAdminUser, createUser } from '../fixtures/auth';
import { E2E_API_URL } from '../fixtures/config';
import { findLokiRequests, lokiRequestCount } from '../fixtures/loki-stubs';
import { expect, test } from '../fixtures/test';

test.describe.serial('Diagnostics API (/api/v1/diagnostics)', () => {
  let adminCookie: string;
  let nonAdminCookie: string;

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    try {
      const admin = await createAdminUser(request);
      adminCookie = admin.cookie;

      const nonAdmin = await createUser(request, 'diag-user');
      nonAdminCookie = nonAdmin.cookie;
    } finally {
      await request.dispose();
    }
  });

  test('GET /api/v1/auth/me returns admin:true for admin and admin:false for regular user', async () => {
    const adminApi = makeApi(adminCookie);
    const nonAdminApi = makeApi(nonAdminCookie);

    const adminMe = await adminApi.GET('/api/v1/auth/me');
    expect(adminMe.response.status).toBe(200);
    expect(adminMe.data?.admin).toBe(true);
    expect(adminMe.data?.email).toBe('e2e-admin@example.test');

    const nonAdminMe = await nonAdminApi.GET('/api/v1/auth/me');
    expect(nonAdminMe.response.status).toBe(200);
    expect(nonAdminMe.data?.admin).toBe(false);
  });

  test('Every error body carries requestId matching X-Request-Id header, including custom IDs', async () => {
    // 1. 404 NOT_FOUND for unknown account
    const nonAdminApi = makeApi(nonAdminCookie);
    const notFoundRes = await nonAdminApi.GET('/api/v1/accounts/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
    });
    expect(notFoundRes.response.status).toBe(404);
    const headerReqId = notFoundRes.response.headers.get('x-request-id');
    expect(headerReqId).toBeTruthy();
    expect(notFoundRes.error?.requestId).toBe(headerReqId);

    // 2. 400 VALIDATION_ERROR on bad ref
    const adminApi = makeApi(adminCookie);
    const badRefRes = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'bad$ref!' } },
    });
    expect(badRefRes.response.status).toBe(400);
    const badRefHeaderId = badRefRes.response.headers.get('x-request-id');
    expect(badRefHeaderId).toBeTruthy();
    expect(badRefRes.error?.requestId).toBe(badRefHeaderId);

    // 3. 401 UNAUTHORIZED via raw fetch without session cookie
    const unauthFetch = await fetch(`${E2E_API_URL}/api/v1/auth/me`, {
      headers: { Accept: 'application/json' },
    });
    expect(unauthFetch.status).toBe(401);
    const unauthHeaderId = unauthFetch.headers.get('x-request-id');
    expect(unauthHeaderId).toBeTruthy();
    const unauthJson = (await unauthFetch.json()) as { code: string; requestId?: string };
    expect(unauthJson.code).toBe('UNAUTHORIZED');
    expect(unauthJson.requestId).toBe(unauthHeaderId);

    // 4. Custom X-Request-Id header is echoed in response header and body
    const customId = 'e2e-custom-1';
    const customFetch = await fetch(`${E2E_API_URL}/api/v1/accounts/00000000-0000-0000-0000-000000000000`, {
      headers: {
        Accept: 'application/json',
        Cookie: `FINANCEOS_SESSION=${nonAdminCookie}`,
        'X-Request-Id': customId,
      },
    });
    expect(customFetch.status).toBe(404);
    expect(customFetch.headers.get('x-request-id')).toBe(customId);
    const customJson = (await customFetch.json()) as { requestId?: string };
    expect(customJson.requestId).toBe(customId);
  });

  test('Non-admin lookup and raw return 403 FORBIDDEN', async () => {
    const nonAdminApi = makeApi(nonAdminCookie);

    const lookupRes = await nonAdminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'E2EERR01' } },
    });
    expect(lookupRes.response.status).toBe(403);
    expect(lookupRes.error?.code).toBe('FORBIDDEN');

    const rawRes = await nonAdminApi.GET('/api/v1/diagnostics/lookup/raw', {
      params: { query: { ref: 'E2EERR01' } },
    });
    expect(rawRes.response.status).toBe(403);
    expect(rawRes.error?.code).toBe('FORBIDDEN');
  });

  test('Admin lookup with bad ref returns 400 VALIDATION_ERROR', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'bad$invalid*ref' } },
    });
    expect(res.response.status).toBe(400);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  test('Admin lookup E2EERR01 resolves request, rootCause, and timeline', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'E2EERR01' } },
    });
    expect(res.response.status).toBe(200);
    const data = res.data!;
    expect(data.found).toBe(true);
    expect(data.ref).toBe('E2EERR01');
    expect(data.refType).toBe('errorId');
    expect(data.errorId).toBe('E2EERR01');
    expect(data.requestId).toBe('e2ereq0000000000001a');
    expect(data.rawAvailable).toBe(true);

    // Request summary
    expect(data.request).not.toBeNull();
    expect(data.request?.method).toBe('POST');
    expect(data.request?.route).toBe('/api/v1/accounts');
    expect(data.request?.status).toBe(500);
    expect(data.request?.version).toBe('1.0.0-e2e');
    expect(data.request?.userEmail).toBeNull();

    // Root cause analysis
    expect(data.rootCause).not.toBeNull();
    expect(data.rootCause?.kind).toBe('SERVER_EXCEPTION');
    expect(data.rootCause?.exceptionClass).toBe('org.hibernate.AssertionFailure');
    expect(data.rootCause?.rootFrame).toBe('org.hibernate.AssertionFailure: null identifier (Demo)');
    expect(data.rootCause?.oraCode).toBeNull();

    // Timeline entries
    expect(data.timeline.length).toBe(2);
    const errorEntry = data.timeline.find((e) => e.level === 'ERROR');
    expect(errorEntry).toBeDefined();
    expect(errorEntry?.stackTrace).toContain('org.hibernate.AssertionFailure: null identifier (Demo)');

    // Ensure no "null" string values in fields
    for (const entry of data.timeline) {
      if (entry.fields) {
        for (const [k, v] of Object.entries(entry.fields)) {
          expect(v, `Field ${k} was string "null"`).not.toBe('null');
        }
      }
    }
  });

  test('Admin lookup by requestId resolves same errorId', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'e2ereq0000000000001a' } },
    });
    expect(res.response.status).toBe(200);
    const data = res.data!;
    expect(data.found).toBe(true);
    expect(data.refType).toBe('requestId');
    expect(data.errorId).toBe('E2EERR01');
    expect(data.requestId).toBe('e2ereq0000000000001a');
    expect(data.rootCause?.kind).toBe('SERVER_EXCEPTION');
  });

  test('type=requestId override on an errorId string produces not found shape', async () => {
    const adminApi = makeApi(adminCookie);

    // E2EERR01 queried explicitly as requestId will search requestId="E2EERR01" which matches empty fallback
    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'E2EERR01', type: 'requestId' } },
    });
    expect(res.response.status).toBe(200);
    const data = res.data!;
    expect(data.found).toBe(false);
    expect(data.errorId).toBeNull();
    expect(data.rootCause?.kind).toBe('NOT_FOUND_IN_LOGS');
  });

  test('Unknown ref returns found:false, NOT_FOUND_IN_LOGS with 4 hints and rawAvailable:false', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'NONEXIST1' } },
    });
    expect(res.response.status).toBe(200);
    const data = res.data!;
    expect(data.found).toBe(false);
    expect(data.errorId).toBeNull();
    expect(data.requestId).toBe('NONEXIST1');
    expect(data.rawAvailable).toBe(false);
    expect(data.timeline).toEqual([]);
    expect(data.rootCause?.kind).toBe('NOT_FOUND_IN_LOGS');
    expect(data.rootCause?.hints.length).toBe(4);
  });

  test('GET /api/v1/diagnostics/lookup/raw returns untouched lines and labels', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup/raw', {
      params: { query: { ref: 'E2EERR01' } },
    });
    expect(res.response.status).toBe(200);
    const list = res.data!;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    expect(list[0].labels).toBeDefined();
    expect(list[0].labels.service).toBe('financeos-server');
    expect(list[0].line).toContain('request.failed');
  });

  test('E2EUNAV1 returns 503 DIAGNOSTICS_UNAVAILABLE mentioning LOKI_QUERY_TOKEN', async () => {
    const adminApi = makeApi(adminCookie);

    const res = await adminApi.GET('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'E2EUNAV1' } },
    });
    expect(res.response.status).toBe(503);
    expect(res.error?.code).toBe('DIAGNOSTICS_UNAVAILABLE');
    expect(res.error?.message).toContain('LOKI_QUERY_TOKEN');
  });

  test('WireMock proves Loki query_range calls were authenticated with Basic auth', async () => {
    const count = await lokiRequestCount();
    expect(count).toBeGreaterThan(0);

    const requests = await findLokiRequests();
    expect(requests.length).toBeGreaterThan(0);

    const expectedAuth = 'Basic ' + Buffer.from('e2e:e2e-token').toString('base64');
    for (const req of requests) {
      expect(req.headers['Authorization'] || req.headers['authorization']).toBe(expectedAuth);
    }
  });
});
