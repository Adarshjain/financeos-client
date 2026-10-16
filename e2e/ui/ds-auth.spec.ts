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
    await page.goto(`${E2E_CLIENT_URL}/ds/signup`);
    await page.getByLabel('Invite code').fill('wrong-code-xyz');
    await page.getByLabel('Email').fill(nextEmail('bad-invite'));
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

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
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('signup password under 8 characters shows danger banner before submit', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/ds/signup`);
    await page.getByLabel('Invite code').fill(INVITE_CODE);
    await page.getByLabel('Email').fill(nextEmail('short-pwd'));
    await page.getByLabel('Password').fill('12345');
    await page.getByRole('button', { name: 'Create account' }).click();

    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Password must be at least 8 characters.');
    expect(page.url()).toContain('/ds/signup');
  });

  test('login from= redirect: visit /ds/login?from=/accounts -> login -> lands on /accounts', async ({
    page,
    request,
  }) => {
    // Create user via API first
    const u = await createUser(request, 'from-redirect-ds');

    // Visit /ds/login with from parameter
    await page.goto(`${E2E_CLIENT_URL}/ds/login?from=/accounts`);
    expect(page.url()).toContain('/ds/login');
    expect(page.url()).toContain('from=');

    // Fill login form
    await page.getByLabel('Email').fill(u.email);
    await page.getByLabel('Password').fill(u.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Lands on /accounts
    await page.waitForURL('**/accounts', { timeout: 15000 });
    expect(page.url()).toContain('/accounts');
  });

  test('login empty submit shows danger banner without navigating', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/ds/login`);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email and password are required.');
    expect(page.url()).toContain('/ds/login');
  });

  test('login with ?deleted=1 shows account deleted success notice', async ({ page }) => {
    await page.goto(`${E2E_CLIENT_URL}/ds/login?deleted=1`);
    await expect(page.getByText('Your account has been deleted.')).toBeVisible();
  });
});
