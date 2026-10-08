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

  test('legacy /settings/ingest redirects to /transactions/import and keeps the account query', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Redirect Bank' });

    await page.goto(`/settings/ingest?account=${account.id}`);
    await page.waitForURL(`**/transactions/import?account=${account.id}`);
    await expect(page.getByRole('heading', { name: 'Import statements', exact: true })).toBeVisible();
    await expect(page.getByLabel('Select Financial Account')).toContainText('Redirect Bank');

    // Without a query the redirect carries none.
    await page.goto('/settings/ingest');
    await page.waitForURL('**/transactions/import');
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByRole('heading', { name: 'Import statements', exact: true })).toBeVisible();
  });

  test('legacy /settings/jobs redirects to /settings/activity and keeps the filters', async ({ page }) => {
    await page.goto('/settings/jobs?status=FAILED&type=GMAIL_SYNC');
    await page.waitForURL('**/settings/activity?**');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/settings/activity');
    expect(url.searchParams.get('status')).toBe('FAILED');
    expect(url.searchParams.get('type')).toBe('GMAIL_SYNC');
    await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();

    await page.goto('/settings/jobs');
    await page.waitForURL('**/settings/activity');
    await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  });

  test('legacy /loans/calendar redirects to /upcoming', async ({ page }) => {
    await page.goto('/loans/calendar');
    await page.waitForURL('**/upcoming');
    await expect(page.getByRole('heading', { name: 'Upcoming', level: 1 })).toBeVisible();
  });

  test('Settings links to Activity, and the statement import page links back to Transactions', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await page.locator('main').getByRole('link', { name: 'Activity' }).click();
    await page.waitForURL('**/settings/activity');
    await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();

    await page.goto('/transactions/import');
    await expect(page.getByRole('heading', { name: 'Import statements', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent statement ingestion jobs' })).toBeVisible();
  });

  test('Holdings links to Instruments', async ({ page }) => {
    await page.goto('/investments');
    await expect(page.getByRole('heading', { name: /Portfolio Holdings/i, level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Instruments', exact: true }).first().click();
    await page.waitForURL('**/investments/instruments');
    await expect(page.getByRole('heading', { name: /Instruments/i, level: 1 })).toBeVisible();
  });

  test('desktop sidebar: top-level links, grouped modules, Chat shortcut and the Inbox badge', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    await seedDueSoonLoan(api, 'Sidebar Loan');

    await page.goto('/dashboard');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    for (const [name, href] of [
      ['Home', '/dashboard'],
      ['Inbox', '/inbox'],
      ['Upcoming', '/upcoming'],
      ['Accounts', '/accounts'],
    ] as const) {
      await expect(sidebar.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('href', href);
    }
    await expect(sidebar.getByRole('link', { name: 'Chat', exact: true })).toHaveAttribute('href', '/chat');
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    // The EMI due in three days is one act-now row, so the badge reads at least 1.
    await expect(sidebar.getByTestId('inbox-nav-badge')).toHaveText(/^[1-9]\d*\+?$/);

    // Modules: Transactions groups Import with the other transaction pages.
    await sidebar.getByRole('button', { name: 'Transactions', exact: true }).click();
    await sidebar.getByRole('link', { name: 'Import', exact: true }).click();
    await page.waitForURL('**/transactions/import');
    await expect(sidebar.getByRole('link', { name: 'Import', exact: true })).toBeVisible();

    // Navigate through the top-level links.
    await sidebar.getByRole('link', { name: /^Inbox/ }).click();
    await page.waitForURL('**/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();
    await sidebar.getByRole('link', { name: 'Upcoming' }).click();
    await page.waitForURL('**/upcoming');
    await sidebar.getByRole('link', { name: 'Accounts' }).click();
    await page.waitForURL('**/accounts');
    await sidebar.getByRole('link', { name: 'Chat', exact: true }).click();
    await page.waitForURL('**/chat');
  });

  test('@mobile bottom bar: Home, Inbox, Upcoming, Transactions and the contextual bar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The bottom bar only exists below the desktop breakpoint');
    const api = makeApi(currentUser.cookie);
    await seedDueSoonLoan(api, 'Bar Loan');

    await page.goto('/dashboard');
    const bar = page.locator('nav').filter({ has: page.getByLabel('Open navigation menu') });
    for (const [name, href] of [
      ['Home', '/dashboard'],
      ['Inbox', '/inbox'],
      ['Upcoming', '/upcoming'],
      ['Transactions', '/transactions'],
    ] as const) {
      await expect(bar.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('href', href);
    }
    await expect(bar.getByRole('link', { name: 'Return to Home' })).toHaveCount(0);
    await expect(bar.getByTestId('inbox-nav-badge')).toHaveText(/^[1-9]\d*\+?$/);

    await bar.getByRole('link', { name: /^Inbox/ }).click();
    await page.waitForURL('**/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();

    // Inside Transactions the bar switches to that module's pages and offers a way back Home.
    await bar.getByRole('link', { name: 'Transactions', exact: true }).click();
    await page.waitForURL('**/transactions');
    await expect(bar.getByRole('link', { name: 'Review', exact: true })).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Import', exact: true })).toBeVisible();
    await bar.getByRole('link', { name: 'Return to Home' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('@mobile menu sheet: Accounts, grouped pages incl. Settings, signed-in email and Sign out', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu sheet only exists below the desktop breakpoint');
    await page.goto('/dashboard');

    await page.getByLabel('Open navigation menu').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('link', { name: /Chat/ }).first()).toHaveAttribute('href', '/chat');
    await expect(sheet.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/accounts');
    // Settings is a group of chips like the others.
    const settingsChips: Record<string, string> = {
      'Profile & appearance': '/settings',
      Connections: '/settings/gmail',
      'AI keys': '/settings/llm-keys',
      Notifications: '/settings/notifications',
      Activity: '/settings/activity',
      Debug: '/debug',
    };
    for (const [chip, href] of Object.entries(settingsChips)) {
      await expect(sheet.getByRole('link', { name: chip, exact: true })).toHaveAttribute('href', href);
    }
    for (const group of ['Transactions', 'Investments & Portfolio', 'Loans & Lendings', 'Rewards', 'Insights', 'Settings']) {
      await expect(sheet.getByText(group, { exact: true })).toBeVisible();
    }
    await expect(sheet.getByText('Signed in as')).toBeVisible();
    await expect(sheet.getByText(currentUser.email)).toBeVisible();

    // The Transactions group lists its pages as chips; a chip navigates and closes the sheet.
    for (const chip of ['All', 'Review', 'Rules', 'Categories', 'Import']) {
      await expect(sheet.getByRole('link', { name: chip, exact: true }).first()).toBeVisible();
    }
    await sheet.getByRole('link', { name: 'Import', exact: true }).click();
    await page.waitForURL('**/transactions/import');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen from another page: the current page is marked active, and Sign out is a button in the sheet.
    await page.getByLabel('Open navigation menu').click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Import', exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
