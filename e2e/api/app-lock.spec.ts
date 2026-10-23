import { createUser } from '../fixtures/auth';
import { E2E_API_URL, E2E_CLIENT_URL } from '../fixtures/config';
import { SoftAuthenticator } from '../fixtures/softAuthenticator';
import { expect, test } from '../fixtures/test';

const BASE = `${E2E_API_URL}/api/v1`;
// The server's relying party: rp id localhost, origin = where the client is served (APP_LOCK_ORIGINS).
const authenticator = () => new SoftAuthenticator('localhost', E2E_CLIENT_URL);

interface Session {
  cookie: string;
}

async function call(session: Session, method: string, path: string, body?: unknown, extraCookie = '') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `FINANCEOS_SESSION=${session.cookie}${extraCookie}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

async function enrol(session: Session, soft: SoftAuthenticator, lockAfterSeconds = 60, deviceCookie = '') {
  const options = await call(session, 'POST', '/app-lock/registration/options', { lockAfterSeconds }, deviceCookie);
  expect(options.status).toBe(200);
  const verify = await call(
    session,
    'POST',
    '/app-lock/registration/verify',
    { credential: soft.create(options.body), label: 'e2e' },
    deviceCookie,
  );
  expect(verify.status).toBe(200);
  return verify.body.deviceId as string;
}

async function lockNow(session: Session) {
  // The server ignores /lock within 2s of an unlock or enrolment.
  await new Promise((r) => setTimeout(r, 2300));
  expect((await call(session, 'POST', '/app-lock/lock')).status).toBe(204);
}

async function unlock(session: Session, soft: SoftAuthenticator, opts?: { userVerified?: boolean; badSignature?: boolean }) {
  const options = await call(session, 'POST', '/app-lock/unlock/options');
  expect(options.status).toBe(200);
  return call(session, 'POST', '/app-lock/unlock/verify', { credential: soft.get(options.body, opts) });
}

test.describe('app lock API', () => {
  test('a session with app lock off is untouched: status unarmed, heartbeat harmless, data readable', async ({ request }) => {
    const user = await createUser(request, 'lock-off');
    const status = await call(user, 'GET', '/app-lock/status');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ armed: false, locked: false, rpId: 'localhost', heartbeatSeconds: 15 });
    expect((await call(user, 'POST', '/app-lock/heartbeat')).status).toBe(204);
    expect((await call(user, 'GET', '/accounts')).status).toBe(200);
  });

  test('enrolled and locked: data calls get 423 APP_LOCKED, the open paths still answer', async ({ request }) => {
    const user = await createUser(request, 'lock-423');
    const soft = authenticator();
    await enrol(user, soft);
    const armed = await call(user, 'GET', '/app-lock/status');
    expect(armed.body).toMatchObject({ armed: true, locked: false, lockAfterSeconds: 60 });
    expect((await call(user, 'GET', '/accounts')).status).toBe(200);

    await lockNow(user);

    const accounts = await call(user, 'GET', '/accounts');
    expect(accounts.status).toBe(423);
    expect(accounts.body).toMatchObject({ code: 'APP_LOCKED', message: 'FinanceOS is locked' });
    expect((await call(user, 'GET', '/auth/me')).status).toBe(423);
    expect((await call(user, 'POST', '/app-lock/heartbeat')).status).toBe(423);

    const status = await call(user, 'GET', '/app-lock/status');
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ armed: true, locked: true });
    expect((await call(user, 'POST', '/app-lock/unlock/options')).status).toBe(200);
    expect((await call(user, 'POST', '/app-lock/lock')).status).toBe(204);
  });

  test('a valid unlock opens the app again', async ({ request }) => {
    const user = await createUser(request, 'lock-unlock');
    const soft = authenticator();
    await enrol(user, soft);
    await lockNow(user);
    expect((await call(user, 'GET', '/accounts')).status).toBe(423);
    expect((await unlock(user, soft)).status).toBe(204);
    expect((await call(user, 'GET', '/accounts')).status).toBe(200);
  });

  test('a wrong signature and a missing user verification are refused with 403 APP_LOCK_UNLOCK_FAILED, and stay locked', async ({ request }) => {
    const user = await createUser(request, 'lock-refused');
    const soft = authenticator();
    await enrol(user, soft);
    await lockNow(user);

    const bad = await unlock(user, soft, { badSignature: true });
    expect(bad.status).toBe(403);
    expect(bad.body.code).toBe('APP_LOCK_UNLOCK_FAILED');
    const unverified = await unlock(user, soft, { userVerified: false });
    expect(unverified.status).toBe(403);
    expect((await call(user, 'GET', '/accounts')).status).toBe(423);
    // and a right answer after failures still works
    expect((await unlock(user, soft)).status).toBe(204);
  });

  test("another user's passkey cannot unlock", async ({ request }) => {
    const owner = await createUser(request, 'lock-owner');
    const other = await createUser(request, 'lock-other');
    await enrol(owner, authenticator());
    const intruder = authenticator();
    await enrol(other, intruder);
    await lockNow(owner);
    const options = await call(owner, 'POST', '/app-lock/unlock/options');
    const res = await call(owner, 'POST', '/app-lock/unlock/verify', { credential: intruder.get(options.body) });
    expect(res.status).toBe(403);
  });

  test('the fifth failed unlock ends the session (401), the first four are 403', async ({ request }) => {
    const user = await createUser(request, 'lock-five');
    const soft = authenticator();
    await enrol(user, soft);
    await lockNow(user);
    for (let i = 1; i <= 4; i += 1) {
      const res = await unlock(user, soft, { badSignature: true });
      expect(res.status, `failure ${i}`).toBe(403);
    }
    const fifth = await unlock(user, soft, { badSignature: true });
    expect(fifth.status).toBe(401);
    expect(fifth.body.code).toBe('UNAUTHORIZED');
    expect((await call(user, 'GET', '/accounts')).status).toBe(401);
  });

  test('sign-in with the device cookie is armed and unlocked; without it the session is unarmed', async ({ request }) => {
    const user = await createUser(request, 'lock-device');
    const deviceId = await enrol(user, authenticator());
    const login = async (cookie?: string) => {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ email: user.email, password: user.password }),
      });
      expect(res.status).toBe(200);
      return { cookie: /FINANCEOS_SESSION=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')![1] };
    };
    const withDevice = await login(`FINANCEOS_DEVICE=${deviceId}`);
    expect((await call(withDevice, 'GET', '/app-lock/status')).body).toMatchObject({ armed: true, locked: false });
    expect((await call(withDevice, 'GET', '/accounts')).status).toBe(200);
    const without = await login();
    expect((await call(without, 'GET', '/app-lock/status')).body).toMatchObject({ armed: false });
  });

  test('changing Lock after, then turning off', async ({ request }) => {
    const user = await createUser(request, 'lock-settings');
    await enrol(user, authenticator());
    expect((await call(user, 'PATCH', '/app-lock/settings', { lockAfterSeconds: 900 })).status).toBe(204);
    expect((await call(user, 'GET', '/app-lock/status')).body.lockAfterSeconds).toBe(900);
    expect((await call(user, 'PATCH', '/app-lock/settings', { lockAfterSeconds: 7 })).status).toBe(400);
    expect((await call(user, 'DELETE', '/app-lock')).status).toBe(204);
    expect((await call(user, 'GET', '/app-lock/status')).body).toMatchObject({ armed: false });
  });

  test('logout works while locked', async ({ request }) => {
    const user = await createUser(request, 'lock-logout');
    await enrol(user, authenticator());
    await lockNow(user);
    expect((await call(user, 'POST', '/auth/logout')).status).toBe(200);
  });

  test('enrolling again on a device that already has a row returns a new device id', async ({ request }) => {
    const user = await createUser(request, 'lock-reenrol');
    const first = await enrol(user, authenticator());
    const second = await enrol(user, authenticator(), 60, `; FINANCEOS_DEVICE=${first}`);
    expect(second).not.toBe(first);
  });
});
