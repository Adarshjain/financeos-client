import type { Page } from '@playwright/test';

import { type CreatedUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';
import { addVirtualAuthenticator, type VirtualAuthenticator } from '../fixtures/virtualAuthenticator';

const TOGGLE = 'Unlock with Face ID or fingerprint';

test.describe('/ds app lock (@ui)', () => {
  let user: CreatedUser;
  let authenticator: VirtualAuthenticator;

  test.beforeEach(async ({ context, request, page }) => {
    user = await createUser(request, 'ui-app-lock');
    await loginContext(context, user.cookie);
    authenticator = await addVirtualAuthenticator(context, page);
  });

  const toggle = (page: Page) => page.getByRole('switch', { name: TOGGLE });

  async function turnOn(page: Page) {
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await expect(toggle(page)).toBeEnabled();
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  }

  /** What the "Immediately" beacon does, past the server's 2s guard after an unlock. */
  async function lockNow(page: Page) {
    await page.waitForTimeout(2300);
    const res = await page.request.post(`${E2E_CLIENT_URL}/api/v1/app-lock/lock`);
    expect(res.status()).toBe(204);
  }

  /** Records every URL the main frame visits, to prove the lock screen was shown before an automatic unlock. */
  function trackVisited(page: Page) {
    const visited: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visited.push(frame.url());
    });
    return visited;
  }

  test('@mobile turn on, leave the app, come back: the lock screen unlocks by itself to the same page', async ({ page }) => {
    await turnOn(page);
    await expect(page.getByText('Lock after')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Lock after' })).toContainText('1 minute');

    // Immediately: hiding the page sends the lock beacon (not before the 3s after arriving).
    await page.getByRole('combobox', { name: 'Lock after' }).click();
    await page.getByRole('option', { name: 'Immediately' }).click();
    await expect(page.getByRole('combobox', { name: 'Lock after' })).toContainText('Immediately');
    await page.waitForTimeout(3300);
    const beacon = page.waitForRequest((r) => r.url().endsWith('/api/v1/app-lock/lock'));
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await beacon;

    const visited = trackVisited(page);
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    // No click: the passkey prompt opens on its own and returns to the page.
    await page.waitForURL('**/settings');
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
    expect(visited.some((u) => u.includes('/locked?from=%2Fsettings'))).toBe(true);
  });

  test('when the automatic prompt is refused the screen stays quiet; tapping Unlock then works', async ({ page }) => {
    await turnOn(page);
    await lockNow(page);
    await authenticator.setUserVerified(false);
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await page.waitForURL('**/locked?from=*');
    await expect(page.getByRole('heading', { name: 'FinanceOS is locked' })).toBeVisible();
    await expect(page.getByText('Use Face ID or your fingerprint to open the app.')).toBeVisible();
    // Give the automatic try time to be refused: no error, no redirect, the button is back.
    await page.waitForTimeout(1500);
    await expect(page.getByText("Couldn't verify. Try again.")).toBeHidden();
    await expect(page.getByRole('button', { name: 'Unlock' })).toBeEnabled();
    expect(page.url()).toContain('/locked');

    await authenticator.setUserVerified(true);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForURL('**/settings');
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  });

  test('moving around the app while locked lands on the lock screen', async ({ page }) => {
    await turnOn(page);
    await lockNow(page);
    await authenticator.setUserVerified(false); // keep the screen so it can be inspected
    await page.getByRole('link', { name: 'Loans & lendings' }).first().click();
    await page.waitForURL('**/locked?from=*');
    await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible();
    // Staying on the lock screen keeps where they were going: a late event or focus must not reload it bare.
    const landed = page.url();
    expect(landed).toContain('from=%2Floans');
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(500);
    expect(page.url()).toBe(landed);
  });

  test('a Legacy page goes to the same lock screen and comes back by itself after the automatic unlock', async ({ page }) => {
    await turnOn(page);
    await lockNow(page);
    const visited = trackVisited(page);
    await page.goto(`${E2E_CLIENT_URL}/legacy/loans/calendar`);
    // /legacy/loans/calendar itself redirects to /legacy/upcoming once unlocked.
    await page.waitForURL('**/legacy/upcoming');
    await expect(page).toHaveURL(/\/legacy\/upcoming$/);
    expect(visited.some((u) => u.includes('/locked?from=%2Flegacy%2Floans%2Fcalendar'))).toBe(true);
  });

  test('sign out from the lock screen, sign in with the password: the app opens and app lock stays on', async ({ page }) => {
    await turnOn(page);
    await lockNow(page);
    await authenticator.setUserVerified(false); // stay on the lock screen
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await page.waitForURL('**/locked?from=*');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login**');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    // Signing in by the form (no page.goto after) must start the watcher: it keeps the session alive.
    const heartbeat = page.waitForRequest((r) => r.url().endsWith('/api/v1/app-lock/heartbeat'));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await heartbeat;

    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await expect(page).toHaveURL(/\/settings$/);
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  });

  test('a failed Face ID shows the error and the way out; the next good try unlocks', async ({ page }) => {
    await turnOn(page);
    await lockNow(page);
    await authenticator.setUserVerified(false);
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await page.waitForURL('**/locked?from=*');
    // The refused automatic try says nothing; only a tap shows the error.
    await page.waitForTimeout(1500);
    await expect(page.getByText("Couldn't verify. Try again.")).toBeHidden();

    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByText("Couldn't verify. Try again.")).toBeVisible();
    await expect(page.getByText(/Can't unlock\? Sign out, sign in with your password/)).toBeVisible();
    expect(page.url()).toContain('/locked');

    await authenticator.setUserVerified(true);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForURL('**/settings');
  });

  test('after five wrong answers the session ends and Unlock goes to sign-in', async ({ page, playwright }) => {
    await turnOn(page);
    await lockNow(page);
    await authenticator.setUserVerified(false); // the automatic try is refused, so it never counts
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await page.waitForURL('**/locked?from=*');

    // The wrong answers come from outside the browser, so its cookie jar keeps the (soon ended) session like a real device would.
    const other = await playwright.request.newContext({ extraHTTPHeaders: { Cookie: `FINANCEOS_SESSION=${user.cookie}` } });
    for (let i = 1; i <= 4; i += 1) {
      const res = await other.post(`${E2E_CLIENT_URL}/api/v1/app-lock/unlock/verify`, { data: { credential: {} } });
      expect(res.status(), `failure ${i}`).toBe(403);
      expect((await res.json()).code).toBe('APP_LOCK_UNLOCK_FAILED');
    }
    const fifth = await other.post(`${E2E_CLIENT_URL}/api/v1/app-lock/unlock/verify`, { data: { credential: {} } });
    expect(fifth.status()).toBe(401);
    await other.dispose();

    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForURL('**/login**');
  });

  test('turning it off: the switch stays off after a reload and the app never locks', async ({ page, context }) => {
    await turnOn(page);
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Lock after')).toBeHidden();
    expect((await context.cookies()).some((c) => c.name === 'FINANCEOS_DEVICE')).toBe(false);

    await page.waitForTimeout(2300);
    await page.request.post(`${E2E_CLIENT_URL}/api/v1/app-lock/lock`);
    await page.reload();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
    await page.goto(`${E2E_CLIENT_URL}/loans`);
    await expect(page).toHaveURL(/\/loans$/);
  });

  test('with app lock off there are no heartbeat requests; with it on there are', async ({ page }) => {
    const heartbeats: string[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('/api/v1/app-lock/heartbeat')) heartbeats.push(r.url());
    });
    await page.goto(`${E2E_CLIENT_URL}/settings`);
    await expect(toggle(page)).toBeEnabled();
    await page.waitForTimeout(1500);
    expect(heartbeats).toHaveLength(0);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => heartbeats.length).toBeGreaterThan(0);
  });
});
