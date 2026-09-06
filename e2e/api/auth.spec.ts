import { makeApi } from '../fixtures/api';
import { parseSessionCookie } from '../fixtures/auth';
import { DEFAULT_PASSWORD,E2E_API_URL, INVITE_CODE } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('Auth API (@api)', () => {
  const runId = Date.now().toString(36);
  let userCounter = 0;

  function nextEmail(label = 'auth'): string {
    userCounter += 1;
    return `auth-${runId}-${label}-${userCounter}@example.test`;
  }

  test('signup: ok (201, shape)', async ({ request }) => {
    const email = nextEmail('ok');
    const res = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: {
        email,
        password: DEFAULT_PASSWORD,
        inviteCode: INVITE_CODE,
      },
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.email).toBe(email);
    expect(typeof data.id).toBe('string');
    // Verify no unexpected top-level keys
    const allowedKeys = new Set([
      'id',
      'email',
      'createdAt',
      'updatedAt',
      'displayName',
      'pictureUrl',
      'role',
      'hasPassword',
    ]);
    for (const key of Object.keys(data)) {
      expect(allowedKeys.has(key), `Unexpected key in UserResponse: ${key}`).toBe(true);
    }
  });

  test('signup: duplicate email returns 409', async ({ request }) => {
    const email = nextEmail('dup');
    const res1 = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });
    expect(res1.status()).toBe(201);

    const res2 = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });
    expect(res2.status()).toBe(409);
  });

  test('signup: wrong invite returns 4xx', async ({ request }) => {
    const email = nextEmail('wrong-invite');
    const res = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: 'invalid-code-1234' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('signup: blank invite returns 4xx (fail-closed)', async ({ request }) => {
    const email = nextEmail('blank-invite');
    const res = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: '   ' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('signup: weak or blank password validation', async ({ request }) => {
    const email = nextEmail('weak-pw');
    const resBlank = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: '', inviteCode: INVITE_CODE },
    });
    expect(resBlank.status()).toBeGreaterThanOrEqual(400);
    expect(resBlank.status()).toBeLessThan(500);

    const email2 = nextEmail('short-pw');
    const resShort = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email: email2, password: 'short', inviteCode: INVITE_CODE },
    });
    expect(resShort.status()).toBeGreaterThanOrEqual(400);
    expect(resShort.status()).toBeLessThan(500);
  });

  test('signup: <= 3 failed invite attempts then a good one succeeds', async ({ request }) => {
    for (let i = 1; i <= 3; i++) {
      const badRes = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
        data: {
          email: nextEmail(`bad-attempt-${i}`),
          password: DEFAULT_PASSWORD,
          inviteCode: `bad-code-${i}`,
        },
      });
      expect(badRes.status()).toBe(400);
    }

    // Immediately follow with a valid invite attempt
    const goodEmail = nextEmail('good-after-fails');
    const goodRes = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: {
        email: goodEmail,
        password: DEFAULT_PASSWORD,
        inviteCode: INVITE_CODE,
      },
    });
    expect(goodRes.status()).toBe(201);
  });

  test('login: ok and response shape', async ({ request }) => {
    const email = nextEmail('login-ok');
    const signupRes = await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });
    expect(signupRes.status()).toBe(201);

    const loginRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: DEFAULT_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const data = await loginRes.json();
    expect(data.email).toBe(email);
    expect(typeof data.id).toBe('string');
  });

  test('login: wrong password vs unknown email (status and enumeration behavior)', async ({ request }) => {
    const email = nextEmail('enum-test');
    await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });

    // 1. Existing email with wrong password
    const wrongPwRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: 'WrongPassword123!' },
    });

    // 2. Unknown email
    const unknownEmailRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email: nextEmail('does-not-exist'), password: DEFAULT_PASSWORD },
    });

    // Both should return 401 Unauthorized
    expect(wrongPwRes.status()).toBe(401);
    expect(unknownEmailRes.status()).toBe(401);

    const wrongPwData = await wrongPwRes.json().catch(() => ({ raw: wrongPwRes.text() }));
    const unknownEmailData = await unknownEmailRes.json().catch(() => ({ raw: unknownEmailRes.text() }));

    // Strip volatile timestamp/requestId before comparing bodies
    const normalize = (obj: Record<string, unknown>) => {
      const copy = { ...obj };
      delete copy.timestamp;
      delete copy.requestId;
      return copy;
    };

    expect(normalize(wrongPwData)).toEqual(normalize(unknownEmailData));
  });

  test('login: cookie attributes on Set-Cookie', async ({ request }) => {
    const email = nextEmail('cookie-attr');
    await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });

    const loginRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: DEFAULT_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);

    const setCookieHeaders = loginRes
      .headersArray()
      .filter((h) => h.name.toLowerCase() === 'set-cookie')
      .map((h) => h.value);

    const sessionCookieHeader = setCookieHeaders.find((v) => v.includes('FINANCEOS_SESSION='));
    expect(sessionCookieHeader, 'FINANCEOS_SESSION Set-Cookie header present').toBeDefined();

    const header = sessionCookieHeader!;
    expect(header).toContain('HttpOnly');
    expect(header).toMatch(/SameSite=(Lax|lax)/);
    expect(header).toContain('Max-Age=31536000');
    expect(header).toContain('Path=/');
    // In E2E, COOKIE_SECURE=false, so no "Secure" flag should be attached
    expect(header).not.toMatch(/;\s*Secure/i);
  });

  test('logout: with session invalidates it; without session returns 200', async ({ request }) => {
    const email = nextEmail('logout-test');
    await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });

    const loginRes = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: DEFAULT_PASSWORD },
    });
    const cookie = parseSessionCookie(loginRes.headersArray());
    expect(cookie).toBeDefined();

    const api = makeApi(cookie);

    // Verify authenticated first
    const beforeMe = await api.GET('/api/v1/auth/me');
    expect(beforeMe.response.status).toBe(200);

    // Logout with session -> 200
    const logoutRes = await api.POST('/api/v1/auth/logout');
    expect(logoutRes.response.status).toBe(200);

    // Subsequent /me -> 401
    const afterMe = await api.GET('/api/v1/auth/me');
    expect(afterMe.response.status).toBe(401);

    // Logout without session -> 200 (Spring LogoutFilter behaviour)
    const apiNoSession = makeApi();
    const noSessionLogoutRes = await apiNoSession.POST('/api/v1/auth/logout');
    expect(noSessionLogoutRes.response.status).toBe(200);
  });

  test('concurrent sessions: log in twice, both valid, logout one leaves other valid', async ({
    playwright,
    request,
  }) => {
    const email = nextEmail('concurrent');
    await request.post(`${E2E_API_URL}/api/v1/auth/signup`, {
      data: { email, password: DEFAULT_PASSWORD, inviteCode: INVITE_CODE },
    });

    // Login session 1
    const loginRes1 = await request.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: DEFAULT_PASSWORD },
    });
    const cookie1 = parseSessionCookie(loginRes1.headersArray());
    expect(cookie1).toBeDefined();

    // Login session 2 (using separate context so cookie1 is not sent in request)
    const req2 = await playwright.request.newContext();
    const loginRes2 = await req2.post(`${E2E_API_URL}/api/v1/auth/login`, {
      data: { email, password: DEFAULT_PASSWORD },
    });
    const cookie2 = parseSessionCookie(loginRes2.headersArray());
    expect(cookie2).toBeDefined();
    expect(cookie1).not.toBe(cookie2);

    const api1 = makeApi(cookie1);
    const api2 = makeApi(cookie2);

    // Both sessions valid
    const me1 = await api1.GET('/api/v1/auth/me');
    expect(me1.response.status).toBe(200);
    const me2 = await api2.GET('/api/v1/auth/me');
    expect(me2.response.status).toBe(200);

    // Log out session 1
    const logoutRes1 = await api1.POST('/api/v1/auth/logout');
    expect(logoutRes1.response.status).toBe(200);

    // Session 1 is now 401
    const me1After = await api1.GET('/api/v1/auth/me');
    expect(me1After.response.status).toBe(401);

    // Session 2 is still 200
    const me2After = await api2.GET('/api/v1/auth/me');
    expect(me2After.response.status).toBe(200);
    expect(me2After.data?.email).toBe(email);
  });
});
