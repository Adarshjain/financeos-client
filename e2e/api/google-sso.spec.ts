import { expectStatus, makeApi } from '../fixtures/api';
import { createUser } from '../fixtures/auth';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity } from '../fixtures/google-stubs';
import { GOOGLE_AUTH_URL, SSO_REDIRECT_URI, ssoCallback } from '../fixtures/seed/gmail';
import { expect, test } from '../fixtures/test';

/**
 * Google SSO against the WireMock-played Google (see fixtures/google-stubs.ts). The callback is the
 * server-to-server exchange the client page's server action performs; the browser round trip through
 * the consent stub is covered in ui/google-sso.spec.ts.
 */
test.describe('Google SSO API', () => {
  test.describe.configure({ mode: 'serial' });

  const identities: GoogleIdentity[] = [];

  test.afterAll(async () => {
    for (const identity of identities) {
      await cleanupIdentity(identity);
    }
  });

  test('start returns the consent URL with the SSO parameters (no session needed)', async () => {
    const res = await makeApi().GET('/api/v1/auth/google/start');
    expectStatus(res, 200);
    const authorizationUrl = res.data!.authorizationUrl;
    expect(authorizationUrl.startsWith(`${GOOGLE_AUTH_URL}?`)).toBe(true);

    const url = new URL(authorizationUrl);
    expect(url.searchParams.get('client_id')).toBe('e2e-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(SSO_REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    const scope = url.searchParams.get('scope') ?? '';
    expect(scope.split(' ')).toEqual(
      expect.arrayContaining(['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'])
    );
    expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9]{8}\.[0-9a-f-]{36}$/);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  test('callback signs a new Google user in, sets the session cookie and links a primary Gmail connection (no invite code involved)', async () => {
    const identity = await registerIdentity();
    identities.push(identity);

    const first = await ssoCallback({ code: identity.codes[0] });
    expect(first.status, JSON.stringify(first.error)).toBe(200);
    expect(first.user?.email).toBe(identity.email);
    expect(first.user?.hasPassword).toBe(false);
    expect(first.user?.displayName).toBe(identity.name);
    expect(first.cookie).toBeTruthy();

    const api = makeApi(first.cookie);
    const me = await api.GET('/api/v1/auth/me');
    expectStatus(me, 200);
    expect(me.data?.id).toBe(first.user?.id);

    // The token exchange returned a refresh token, so the sign-in doubled as a Gmail connect.
    const connections = await api.GET('/api/v1/gmail/connections');
    expectStatus(connections, 200);
    expect(connections.data).toHaveLength(1);
    expect(connections.data?.[0]).toMatchObject({ email: identity.email, isPrimary: true, isConnected: true });

    // Signing in again with the same Google account resolves to the same user and connection.
    const second = await ssoCallback({ code: identity.codes[1] });
    expect(second.status).toBe(200);
    expect(second.user?.id).toBe(first.user?.id);
    const connectionsAgain = await makeApi(second.cookie).GET('/api/v1/gmail/connections');
    expect(connectionsAgain.data).toHaveLength(1);
  });

  test('a password account that signs in with Google under the same email is linked, not duplicated', async ({ request }) => {
    const passwordUser = await createUser(request, 'sso-link');
    const before = await makeApi(passwordUser.cookie).GET('/api/v1/auth/me');
    expectStatus(before, 200);

    const identity = await registerIdentity({ email: passwordUser.email });
    identities.push(identity);

    const res = await ssoCallback({ code: identity.codes[0] });
    expect(res.status, JSON.stringify(res.error)).toBe(200);
    expect(res.user?.id).toBe(before.data?.id);
    expect(res.user?.hasPassword).toBe(true);
    expect(res.user?.displayName).toBe(identity.name);

    // Password login keeps working for the linked account.
    const login = await makeApi().POST('/api/v1/auth/login', {
      body: { email: passwordUser.email, password: passwordUser.password },
    });
    expectStatus(login, 200);
  });

  test('FINDING: the state parameter is not validated on the callback', async () => {
    const identity = await registerIdentity();
    identities.push(identity);

    // A state the server never issued is accepted. Documented as a server finding (CSRF hardening);
    // the assertion pins today's behaviour so a fix shows up as a deliberate test change.
    const res = await ssoCallback({ code: identity.codes[0], state: 'never-issued.by-this-server' });
    expect(res.status).toBe(200);
    expect(res.user?.email).toBe(identity.email);
  });

  test('error paths: provider error, missing code and a failing token exchange are all 400s', async () => {
    const denied = await ssoCallback({ error: 'access_denied' });
    expect(denied.status).toBe(400);
    expect(denied.error?.message).toBe('Google sign-in failed: access_denied');

    const noCode = await ssoCallback({});
    expect(noCode.status).toBe(400);
    expect(noCode.error?.message).toBe('Missing authorization code');

    const broken = await registerIdentity({ tokenStatus: 401 });
    identities.push(broken);
    const exchangeFailed = await ssoCallback({ code: broken.codes[0] });
    expect(exchangeFailed.status).toBe(400);
    expect(exchangeFailed.error?.message).toContain('Failed to exchange code for tokens');

    // Google answers a stale or already-used code with 400 invalid_grant; the server relays a 400.
    const stale = await registerIdentity({ tokenStatus: 400 });
    identities.push(stale);
    const invalidGrant = await ssoCallback({ code: stale.codes[0] });
    expect(invalidGrant.status).toBe(400);
    expect(invalidGrant.error?.message).toContain('invalid_grant');
  });
});
