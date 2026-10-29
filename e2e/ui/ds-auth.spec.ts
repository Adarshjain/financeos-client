import { createUser } from '../fixtures/auth';
import { DEFAULT_PASSWORD, E2E_CLIENT_URL, INVITE_CODE } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('/ds Auth UI (@ui)', () => {
  const runId = Date.now().toString(36);
  let uiUserCounter = 0;

  function nextEmail(label = 'ui-ds-auth'): string {
    uiUserCounter += 1;
    return `ui-ds-${runId}-${label}-${uiUserCounter}@example.test`;
  }

  test('signup flow: fill form, submit -> dashboard; wrong invite shows error', async ({ page }) => {
    // 1. Wrong invite shows user-readable error message
    await page.goto(`${E2E_CLIENT_URL}/signup`);
    await expect(page).toHaveTitle('Create account · FinanceOS');
    await page.getByLabel('Email').fill(nextEmail('bad-invite'));
    await page.getByLabel('Password', { exact: true }).fill(DEFAULT_PASSWORD);
    await page.getByLabel('Invite code', { exact: true }).fill('wrong-code-xyz');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Assert error alert inside form is visible and contains readable text (not a status code)
    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    const errorText = await alert.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText).not.toBe('400');
    expect(errorText).not.toBe('500');
    expect(errorText).toMatch(/invalid|invite|closed|error/i);

    // 2. Successful signup lands on the Dinero dashboard
    const goodEmail = nextEmail('good-signup');
    await page.getByLabel('Email').fill(goodEmail);
    await page.getByLabel('Password', { exact: true }).fill(DEFAULT_PASSWORD);
    await page.getByLabel('Invite code', { exact: true }).fill(INVITE_CODE);
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('signup password under 8 characters shows danger banner before submit', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/signup`);
    await page.getByLabel('Email').fill(nextEmail('short-pwd'));
    await page.getByLabel('Password', { exact: true }).fill('12345');
    await page.getByLabel('Invite code', { exact: true }).fill(INVITE_CODE);
    await page.getByRole('button', { name: 'Create account' }).click();

    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Password must be at least 8 characters.');
    expect(page.url()).toContain('/signup');
  });

  test('login from= redirect: visit /login?from=/accounts -> login -> lands on the Dinero /accounts', async ({
    page,
    request,
  }) => {
    // Create user via API first
    const u = await createUser(request, 'from-redirect-ds');

    // Visit /login with from parameter
    await page.goto(`${E2E_CLIENT_URL}/login?from=/accounts`);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('from=');

    // Fill login form
    await page.getByLabel('Email').fill(u.email);
    await page.getByLabel('Password', { exact: true }).fill(u.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Lands on the Dinero accounts page: Dinero links go to built Dinero pages (owner 2026-10-21)
    await page.waitForURL((url) => url.pathname === '/accounts', { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/accounts');
  });

  test('login empty submit shows danger banner without navigating', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/login`);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email and password are required.');
    expect(page.url()).toContain('/login');
  });

  test('login with ?deleted=1 shows account deleted success notice', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/login?deleted=1`);
    await expect(page.getByText('Your account has been deleted.')).toBeVisible();
  });

  test('invalid cookie present: bounced to /login in one hop', async ({ page, context }) => {
    // Set invalid cookie
    await context.addCookies([
      {
        name: 'FINANCEOS_SESSION',
        value: 'bogus-invalid-session-token-xyz',
        url: E2E_CLIENT_URL,
      },
    ]);

    await page.goto(`${E2E_CLIENT_URL}/ds`);
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
    // Ensure login form is displayed, not an error boundary or redirect loop
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });
});
