import { createUser } from '../fixtures/auth';
import { DEFAULT_PASSWORD,E2E_CLIENT_URL, INVITE_CODE } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

test.describe('Auth UI (@ui)', () => {
  const runId = Date.now().toString(36);
  let uiUserCounter = 0;

  function nextEmail(label = 'ui-auth'): string {
    uiUserCounter += 1;
    return `ui-${runId}-${label}-${uiUserCounter}@example.test`;
  }

  test('signup flow: fill form, submit -> dashboard; wrong invite shows error', async ({ page }) => {
    // 1. Wrong invite shows user-readable error message
    await page.goto(`${E2E_CLIENT_URL}/signup`);
    await page.getByLabel('Invite code').fill('wrong-code-xyz');
    await page.getByLabel('Email').fill(nextEmail('bad-invite'));
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Assert error alert inside form is visible and contains readable text (not a status code)
    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    const errorText = await alert.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText).not.toBe('400');
    expect(errorText).not.toBe('500');
    expect(errorText).toMatch(/invalid|invite|closed|error/i);

    // 2. Successful signup lands on dashboard
    const goodEmail = nextEmail('good-signup');
    await page.getByLabel('Invite code').fill(INVITE_CODE);
    await page.getByLabel('Email').fill(goodEmail);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('login from= redirect: visit /accounts signed out -> login -> lands back on /accounts', async ({
    page,
    request,
  }) => {
    // Create user via API first
    const u = await createUser(request, 'from-redirect');

    // Visit protected /accounts signed out
    await page.goto(`${E2E_CLIENT_URL}/accounts`);
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.has('from'), {
      timeout: 10000,
    });
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('from=');

    // Fill login form
    await page.getByLabel('Email').fill(u.email);
    await page.getByLabel('Password').fill(u.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Lands back on /accounts
    await page.waitForURL('**/accounts', { timeout: 15000 });
    expect(page.url()).toContain('/accounts');
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

    await page.goto(`${E2E_CLIENT_URL}/accounts`);
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
    // Ensure login form is displayed, not an error boundary or redirect loop
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

});
