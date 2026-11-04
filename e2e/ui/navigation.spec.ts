import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedDueSoonLoan } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';

test.describe('Navigation and relocated pages (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-navigation');
    await loginContext(context, currentUser.cookie);
  });

  test('old /settings/ingest redirects to /transactions/import and keeps the account query', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Redirect Bank' });

    await page.goto(`/settings/ingest?account=${account.id}`);
    await page.waitForURL(`**/transactions/import?account=${account.id}`);
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('data-state', 'active', { timeout: 30000 });
    await expect(page.getByRole('combobox', { name: 'Account' })).toContainText('Redirect Bank');

    // Without a query the redirect carries none.
    await page.goto('/settings/ingest');
    await page.waitForURL('**/transactions/import');
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('data-state', 'active', { timeout: 30000 });
    await expect(page.getByText('Recent imports', { exact: true })).toBeVisible();
  });

  test('old /settings/jobs redirects to /settings/activity and keeps the filters', async ({ page }) => {
    await page.goto('/settings/jobs?status=FAILED&type=GMAIL_SYNC');
    await page.waitForURL('**/settings/activity?**');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/settings/activity');
    expect(url.searchParams.get('status')).toBe('FAILED');
    expect(url.searchParams.get('type')).toBe('GMAIL_SYNC');
    await expect(page.getByRole('banner')).toContainText('Activity', { timeout: 30000 });

    await page.goto('/settings/jobs');
    await page.waitForURL('**/settings/activity');
    await expect(page.getByRole('banner')).toContainText('Activity', { timeout: 30000 });
  });

  test('old /loans/calendar redirects to /upcoming', async ({ page }) => {
    await page.goto('/loans/calendar');
    await page.waitForURL('**/upcoming');
    await expect(page).toHaveTitle('Upcoming · FinanceOS');
  });

  test('Settings links to Activity, and the Import page lists Recent imports', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: 'Activity' }).click();
    await page.waitForURL('**/settings/activity');
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible({ timeout: 45000 });

    await page.goto('/transactions/import');
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('data-state', 'active', { timeout: 60000 });
    await expect(page.getByText('Recent imports', { exact: true })).toBeVisible();
  });

  test('desktop rail: the Inbox link carries the act-now count', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await seedDueSoonLoan(api, 'Sidebar Loan');

    await page.goto('/dashboard');
    const rail = page.locator('nav.w-container-xs');
    await expect(rail).toBeVisible();

    // The EMI due in three days is one act-now row, so the count reads at least 1.
    await expect(rail.getByRole('link', { name: /^Inbox/ })).toContainText(/[1-9]/, { timeout: 45000 });

    await rail.getByRole('link', { name: /^Inbox/ }).click();
    await page.waitForURL('**/inbox');
  });

  test('@mobile-only tab bar: the Inbox tab carries the act-now count', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await seedDueSoonLoan(api, 'Bar Loan');

    await page.goto('/dashboard');
    const bar = page.locator('nav.desk\\:hidden');
    await expect(bar.getByText(/^[1-9]\d*\+?$/)).toBeVisible({ timeout: 25000 });

    await bar.getByRole('tab', { name: /Inbox/ }).click();
    await page.waitForURL('**/inbox');
  });
});
