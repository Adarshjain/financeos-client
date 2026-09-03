import { makeApi } from '../fixtures/api';
import { E2E_API_URL, E2E_WIREMOCK_URL } from '../fixtures/config';
import { coverage, llmCalls, resetLlm, setLlmMode } from '../fixtures/control';
import { expect, test } from '../fixtures/test';

test.describe('API Smokes', () => {
  test.describe.configure({ mode: 'serial' });

  test('1. signup -> login -> GET /auth/me returns email; no cookie -> 401', async ({ user, api }) => {
    const meRes = await api.GET('/api/v1/auth/me');
    expect(meRes.response.status).toBe(200);
    expect(meRes.data?.email).toBe(user.email);

    const noAuthApi = makeApi();
    const unauthRes = await noAuthApi.GET('/api/v1/auth/me');
    expect(unauthRes.response.status).toBe(401);
  });

  test('2. GET /api/e2e/coverage includes auth endpoints and no /api/e2e/ pattern', async ({ api }) => {
    await api.GET('/api/v1/auth/me');

    const cov = await coverage(api);
    expect(Array.isArray(cov.hits)).toBe(true);

    const loginHit = cov.hits.find(
      (h) => h.method === 'POST' && h.pattern === '/api/v1/auth/login'
    );
    expect(loginHit).toBeDefined();
    expect(loginHit!.ok).toBeGreaterThanOrEqual(1);

    const meHit = cov.hits.find(
      (h) => h.method === 'GET' && h.pattern === '/api/v1/auth/me'
    );
    expect(meHit).toBeDefined();
    expect(meHit!.ok).toBeGreaterThanOrEqual(1);

    const e2eHits = cov.hits.filter((h) => h.pattern.startsWith('/api/e2e'));
    expect(e2eHits).toHaveLength(0);
  });

  test('3. PUT /api/e2e/llm/mode STRICT -> GET calls is array -> DELETE reset -> 204', async ({ api }) => {
    const modeRes = await setLlmMode(api, 'STRICT');
    expect(modeRes.mode).toBe('STRICT');

    const calls = await llmCalls(api);
    expect(Array.isArray(calls)).toBe(true);

    await resetLlm(api);
  });

  test('4. GET /v3/api-docs 200 and paths > 100 keys', async () => {
    const res = await fetch(`${E2E_API_URL}/v3/api-docs`);
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(Object.keys(doc.paths).length).toBeGreaterThan(100);
  });

  test('5. WireMock GET http://localhost:8089/__ping -> 200', async () => {
    const res = await fetch(`${E2E_WIREMOCK_URL}/__ping`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test('6. GET /actuator/health -> 200 {"status":"UP"}', async () => {
    const res = await fetch(`${E2E_API_URL}/actuator/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('UP');
  });
});
