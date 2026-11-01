import type { Page } from '@playwright/test';

import { createAdminUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/**
 * Makes the app's own "Add sender" server action come back as a 500 carrying error id E2EERR01. Dinero pages
 * reach the API through server actions, so the failure is faked in the action's response (the browser never
 * calls /api/v1 itself); the page then raises the same Ref toast as a real server failure.
 */
async function failAddSender(page: Page, message: string) {
  await page.route('**/settings/connections', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST' || !req.headers()['next-action'] || !req.postData()?.includes('debug-toast@bank.test')) {
      return route.continue();
    }
    const real = await route.fetch();
    const [header] = (await real.text()).split('\n');
    const failure = {
      success: false,
      status: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        errorId: 'E2EERR01',
        requestId: 'e2ereq0000000000001a',
        timestamp: new Date().toISOString(),
      },
    };
    return route.fulfill({ response: real, body: `${header}\n1:${JSON.stringify(failure)}\n` });
  });
  await page.goto('/settings/connections');
  await page.getByRole('button', { name: 'Add sender', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add allowed sender' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Sender email address').fill('debug-toast@bank.test');
  await dialog.getByRole('button', { name: 'Add sender', exact: true }).click();
}

test.describe('Debug & Diagnostics UI (@ui)', () => {
  test('Admin journey: /debug?ref=E2EERR01 renders request, root cause, timeline, stack trace, copy raw, 503 error, unknown ref hints', async ({
    page,
    context,
    request,
  }) => {
    const admin = await createAdminUser(request);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginContext(context, admin.cookie);

    // 1. Visit /debug with ref=E2EERR01
    await page.goto(`${E2E_CLIENT_URL}/settings/debug?ref=E2EERR01`);
    await expect(page.getByRole('tab', { name: 'Debug', selected: true })).toBeVisible();

    // Admins get the look-up form
    await expect(page.getByPlaceholder('HM6HK5G6')).toBeVisible();

    // Verify Request Card
    await expect(page.getByText('Request', { exact: true })).toBeVisible();
    await expect(page.getByText('POST').first()).toBeVisible();
    await expect(page.getByText('/api/v1/accounts').first()).toBeVisible();
    await expect(page.getByText('500').first()).toBeVisible();

    // Verify Root Cause Card
    await expect(page.getByText('Root cause', { exact: true })).toBeVisible();
    await expect(page.getByText(/AssertionFailure/).first()).toBeVisible();

    // Verify Timeline List
    await expect(page.getByText('Timeline', { exact: true })).toBeVisible();
    await expect(page.getByText('request.failed').first()).toBeVisible();

    // Expand the ERROR row to view the stack trace
    await page.getByRole('button', { name: 'Show details' }).last().click();
    await expect(page.getByText('org.hibernate.AssertionFailure: null identifier').first()).toBeVisible();

    // Click "Copy raw" and verify success toast
    const copyRawBtn = page.getByRole('button', { name: /Copy raw/i });
    await expect(copyRawBtn).toBeVisible();
    await copyRawBtn.dispatchEvent('click');
    await expectToast(page, /Raw log entries copied to clipboard/i);

    // 2. Search E2EUNAV1 -> shows rose callout with 503 message
    const searchInput = page.getByPlaceholder('HM6HK5G6');
    await searchInput.fill('E2EUNAV1');
    await page.getByRole('button', { name: /Look up/i }).click();

    await expect(page.getByText("Couldn't load that reference")).toBeVisible();

    // 3. Search unknown ref NONEXIST1 -> shows hints
    await searchInput.fill('NONEXIST1');
    await page.getByRole('button', { name: /Look up/i }).click();

    await expect(page.getByText('No log entries found for this reference.')).toBeVisible();
    await expect(page.getByText(/The reference ID was mistyped or incomplete/i)).toBeVisible();
  });

  test('Non-admin journey: /debug shows notice and never calls the diagnostics API', async ({
    page,
    context,
    request,
  }) => {
    const nonAdmin = await createUser(request, 'non-admin-debug');
    await loginContext(context, nonAdmin.cookie);

    // Page-scoped, not a global WireMock counter: admin lookups from other workers run
    // concurrently (fullyParallel), so a shared Loki request count is racy.
    const diagnosticsCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/diagnostics/')) diagnosticsCalls.push(`${req.method()} ${req.url()}`);
    });

    // Visit /debug as non-admin
    await page.goto(`${E2E_CLIENT_URL}/settings/debug`);
    await expect(page.getByRole('tab', { name: 'Debug', selected: true })).toBeVisible();

    // Verify developer notice is shown
    await expect(page.getByText('Look-ups are for admins. Send the reference to the developer.')).toBeVisible();

    // Verify lookup form is not present
    await expect(page.getByPlaceholder('HM6HK5G6')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Look up' })).not.toBeVisible();

    // Verify the browser never issued a diagnostics request (the section is not even mounted)
    await expect(page.getByText(/Recent failures on this device/i)).toBeVisible();
    expect(diagnosticsCalls).toEqual([]);
  });

  test('Toast journey: 500 error shows Ref toast with Copy ID, /debug lists the failure, persists on reload, clear empties', async ({
    page,
    context,
    request,
  }) => {
    const user = await createUser(request, 'toast-user');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginContext(context, user.cookie);

    // Fail the Add sender action with a 500 that carries errorId & requestId, then trigger it
    await failAddSender(page, 'Database assertion failure during creation');

    // Verify toast with Ref E2EERR01
    await expectToast(page, /Ref E2EERR01/);

    // Verify the Copy ID button in the toast. The Dinero toast has no Debug button, so open the page by address.
    const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /Ref E2EERR01/ }).first();
    await expect(toast).toBeVisible();
    await expect(toast.getByRole('button', { name: 'Copy ID' })).toBeVisible();
    await page.goto('/settings/debug?ref=E2EERR01');

    // Local Errors Section lists the record
    await expect(page.getByText(/Recent failures on this device/i)).toBeVisible();
    const localRow = page.locator('div, li').filter({ hasText: 'E2EERR01' }).first();
    await expect(localRow).toBeVisible();

    // Reload page -> record persists in localStorage
    await page.reload();
    await expect(page.getByText(/Recent failures on this device/i)).toBeVisible();
    await expect(page.locator('div, li').filter({ hasText: 'E2EERR01' }).first()).toBeVisible();

    // Click Clear button -> empties local history
    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.getByText('No local failures yet')).toBeVisible();
  });

  test('Mobile journey: Toast with Ref and Copy ID, and the debug list on Pixel 7 viewport (@mobile)', async ({
    page,
    context,
    request,
  }) => {
    const user = await createUser(request, 'mobile-toast-user');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginContext(context, user.cookie);

    await failAddSender(page, 'Database assertion failure on mobile');

    // Toast visible with its Copy ID button. The Dinero toast has no Debug button, so open the page by address.
    await expectToast(page, /Ref E2EERR01/);
    const toast = page.locator('[role="status"], [role="alert"]').filter({ hasText: /Ref E2EERR01/ }).first();
    await expect(toast).toBeVisible();
    await expect(toast.getByRole('button', { name: 'Copy ID' })).toBeVisible();
    await page.goto('/settings/debug?ref=E2EERR01');

    // Tap local row copies ref and triggers success toast
    const refBadge = page.getByText('E2EERR01', { exact: true }).first();
    await expect(refBadge).toBeVisible();
    await refBadge.click();
    await expectToast(page, /Reference E2EERR01 copied/);
  });
});
