import { makeApi } from '../fixtures/api';
import type { GoogleIdentity } from '../fixtures/google-stubs';
import { cleanupIdentity, registerIdentity } from '../fixtures/google-stubs';
import { expect, test } from '../fixtures/test';

/**
 * The whole SSO round trip in a real browser: login page → WireMock consent screen (302 straight back
 * with a code) → /auth/google/callback page → server action exchange → dashboard. The browser-minted
 * code embeds the server's state, so the identity is registered with a redirect_uri-scoped token stub
 * and removed after each test; the tests run serially so two of them never overlap.
 */
test.describe('Google SSO UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });

  let identity: GoogleIdentity | undefined;

  test.afterEach(async () => {
    await cleanupIdentity(identity);
    identity = undefined;
  });

  test('Sign in with Google lands on the dashboard and the settings page shows the Google profile', async ({ page }) => {
    test.slow();
    identity = await registerIdentity({ browserSso: true });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    // Consent stub → client callback page → exchange → hard navigation to the dashboard.
    await page.waitForURL(/\/auth\/google\/callback\?/, { timeout: 20_000 });
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto('/settings');
    // Shown in the sidebar and in the profile card, hence .first().
    await expect(page.getByText(identity.email).first()).toBeVisible();
    await expect(page.getByText(identity.name).first()).toBeVisible();

    // The same session is valid for the API, and the sign-in doubled as a Gmail connect.
    const cookies = await page.context().cookies('http://localhost:6970');
    const session = cookies.find((c) => c.name === 'FINANCEOS_SESSION')?.value;
    expect(session).toBeTruthy();
    const connections = await makeApi(session).GET('/api/v1/gmail/connections');
    expect(connections.data?.map((c) => c.email)).toEqual([identity.email]);
  });

  test('a failing token exchange shows Authentication Failed and returns to login with the error', async ({ page }) => {
    test.slow();
    identity = await registerIdentity({ browserSso: true, tokenStatus: 401 });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with Google' }).click();

    await page.waitForURL(/\/auth\/google\/callback\?/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Authentication Failed' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Redirecting to login...')).toBeVisible();
    await page.waitForURL(/\/login\?error=/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
});
