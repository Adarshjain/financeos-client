import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

test.describe('UI Smokes', () => {
  test('1. Unauthenticated page.goto("/accounts") -> URL becomes /login?from=%2Faccounts', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login\?from=%2Faccounts/);
  });

  test('2. @mobile Form login: fill Email/Password, click Sign in, lands on /dashboard', async ({ page, user }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('3. Cookie-injected context: goto /dashboard renders heading with no redirect', async ({ page, context, user }) => {
    await loginContext(context, user.cookie);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('4. @mobile Sign out -> lands on /login; goto /dashboard redirects to login', async ({ page, context, user, isMobile }) => {
    await loginContext(context, user.cookie);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    if (isMobile) {
      await page.getByLabel('Open navigation menu').click();
      await page.getByRole('menuitem', { name: 'Sign out' }).click();
    } else {
      await page.getByRole('button', { name: 'Sign out' }).click();
    }

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('5. @mobile goto("/") lands on /login when signed out, /dashboard when signed in', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    const fresh = await createUser(page.request, 'smoke-5');
    await loginContext(context, fresh.cookie);
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
