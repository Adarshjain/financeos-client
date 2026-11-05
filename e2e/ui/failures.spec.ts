import { createAdminUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

/**
 * Settings → Debug → Failures. The e2e server has no control endpoint that seeds a failed email or job, so
 * this covers visibility and the screen's shell only; the retry, skip and dismiss flows are unit tested.
 */
test.describe('Failures UI (@ui)', () => {
  test('admin reaches Failures from Debug and sees the counts, the Emails and Jobs tabs', async ({ page, context, request }) => {
    const admin = await createAdminUser(request);
    await loginContext(context, admin.cookie);

    await page.goto(`${E2E_CLIENT_URL}/settings/debug`);
    await page.getByRole('link', { name: /Failures/ }).click();
    await expect(page).toHaveURL(/\/settings\/debug\/failures$/);

    await expect(page.getByRole('heading', { name: 'Failures' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Emails/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry all' })).toBeVisible();

    await page.getByRole('tab', { name: /Jobs/ }).click();
    await expect(page.getByRole('switch')).toBeVisible();
    await expect(page.getByText('Show dismissed')).toBeVisible();
  });

  test('a non-admin sees no Failures entry and the route is not found', async ({ page, context, request }) => {
    const user = await createUser(request, 'no-failures');
    await loginContext(context, user.cookie);

    await page.goto(`${E2E_CLIENT_URL}/settings/debug`);
    await expect(page.getByRole('banner')).toContainText('Debug');
    await expect(page.getByRole('link', { name: /Failures/ })).toHaveCount(0);

    // Settings streams behind its loading skeleton, so notFound() renders the not-found screen
    // under a 200; the API itself answers 403 to non-admins.
    await page.goto(`${E2E_CLIENT_URL}/settings/debug/failures`);
    await expect(page.getByText('Page not found')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Emails/ })).toHaveCount(0);
  });
});
