import { createAdminUser, createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { lokiRequestCount } from '../fixtures/loki-stubs';
import { expect, test } from '../fixtures/test';
import { expectToast, openAccounts } from '../fixtures/ui';

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
    await page.goto(`${E2E_CLIENT_URL}/debug?ref=E2EERR01`);
    await expect(page.getByRole('heading', { name: 'Diagnostics & Debug', level: 1 })).toBeVisible();

    // Verify Admin Mode badge
    await expect(page.getByText('Admin Mode')).toBeVisible();

    // Verify Request Card
    await expect(page.getByText('HTTP Request Summary')).toBeVisible();
    await expect(page.getByText('POST').first()).toBeVisible();
    await expect(page.getByText('/api/v1/accounts').first()).toBeVisible();
    await expect(page.getByText('500').first()).toBeVisible();

    // Verify Root Cause Card
    await expect(page.getByText('Server Exception (AssertionFailure)')).toBeVisible();
    await expect(page.getByText(/AssertionFailure/).first()).toBeVisible();

    // Verify Timeline List
    await expect(page.getByText(/Event Timeline/i)).toBeVisible();
    await expect(page.getByText('request.failed')).toBeVisible();

    // Expand the ERROR row to view the stack trace
    await page.getByText('event=request.failed').first().click();
    await expect(page.locator('pre').filter({ hasText: 'org.hibernate.AssertionFailure: null identifier' })).toBeVisible();

    // Click "Copy raw" and verify success toast
    const copyRawBtn = page.getByRole('button', { name: /Copy raw/i });
    await expect(copyRawBtn).toBeVisible();
    await copyRawBtn.dispatchEvent('click');
    await expectToast(page, /Raw log entries copied to clipboard/i);

    // 2. Search E2EUNAV1 -> shows rose callout with 503 message
    const searchInput = page.getByPlaceholder(/HM6HK5G6/i);
    await searchInput.fill('E2EUNAV1');
    await page.getByRole('button', { name: /Look up/i }).click();

    await expect(page.getByText('Diagnostics Lookup Failed')).toBeVisible();
    await expect(page.getByText(/LOKI_QUERY_TOKEN/i).first()).toBeVisible();

    // 3. Search unknown ref NONEXIST1 -> shows hints
    await searchInput.fill('NONEXIST1');
    await page.getByRole('button', { name: /Look up/i }).click();

    await expect(page.getByText(/Not Found in Logs/i)).toBeVisible();
    await expect(page.getByText(/The reference ID was mistyped or incomplete/i)).toBeVisible();
  });

  test('Non-admin journey: /debug shows notice and does not make Loki queries', async ({
    page,
    context,
    request,
  }) => {
    const nonAdmin = await createUser(request, 'non-admin-debug');
    await loginContext(context, nonAdmin.cookie);

    const initialLokiCount = await lokiRequestCount();

    // Visit /debug as non-admin
    await page.goto(`${E2E_CLIENT_URL}/debug`);
    await expect(page.getByRole('heading', { name: 'Diagnostics & Debug', level: 1 })).toBeVisible();

    // Verify developer notice is shown
    await expect(
      page.getByText('Send this reference to the developer. The list below is stored only in this browser.')
    ).toBeVisible();

    // Verify lookup form is not present
    await expect(page.getByPlaceholder(/HM6HK5G6/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Lookup' })).not.toBeVisible();

    // Verify no new Loki queries were sent
    const finalLokiCount = await lokiRequestCount();
    expect(finalLokiCount).toBe(initialLokiCount);
  });

  test('Toast journey: 500 error shows Ref toast with Copy ID & Debug, navigates to /debug, highlights row, persists on reload, clear empties', async ({
    page,
    context,
    request,
  }) => {
    const user = await createUser(request, 'toast-user');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginContext(context, user.cookie);

    // Navigate to accounts page
    await openAccounts(page);

    // Mock the POST /api/v1/accounts endpoint to return a 500 with errorId & requestId
    await page.route('**/api/v1/accounts', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: {
            'X-Request-Id': 'e2ereq0000000000001a',
          },
          body: JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: 'Database assertion failure during creation',
            errorId: 'E2EERR01',
            requestId: 'e2ereq0000000000001a',
            timestamp: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    // Trigger account creation
    await page.getByRole('button', { name: /Add Account|Get Started/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();
    await page.getByLabel('Account Name').fill('Test Error Account');
    await page.getByLabel('Opening Balance').fill('15000');
    await page.getByLabel('Last 4 Digits').fill('1234');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Verify toast with Ref E2EERR01
    await expectToast(page, /Ref E2EERR01/);

    // Verify Copy ID and Debug buttons in toast
    const toast = page.locator('[data-sonner-toast]').filter({ hasText: /Ref E2EERR01/ });
    await expect(toast).toBeVisible();
    await expect(toast.getByRole('button', { name: 'Copy ID' })).toBeVisible();
    const debugBtn = toast.getByRole('button', { name: 'Debug' });
    await expect(debugBtn).toBeVisible();

    // Click Debug button in toast -> navigates to /debug?ref=E2EERR01
    await debugBtn.dispatchEvent('click');
    await page.waitForURL('**/debug?ref=E2EERR01', { timeout: 10000 });
    expect(page.url()).toContain('/debug?ref=E2EERR01');

    // Local Errors Section lists the record
    await expect(page.getByText(/Recent Failures on This Device/i)).toBeVisible();
    const localRow = page.locator('div, li').filter({ hasText: 'E2EERR01' }).first();
    await expect(localRow).toBeVisible();

    // Reload page -> record persists in localStorage
    await page.reload();
    await expect(page.getByText(/Recent Failures on This Device/i)).toBeVisible();
    await expect(page.locator('div, li').filter({ hasText: 'E2EERR01' }).first()).toBeVisible();

    // Click Clear button -> empties local history
    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.getByText('No local failures recorded in this browser session.')).toBeVisible();
  });

  test('Mobile journey: Toast with Ref, Copy ID, and Debug on Pixel 7 viewport (@mobile)', async ({
    page,
    context,
    request,
  }) => {
    const user = await createUser(request, 'mobile-toast-user');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginContext(context, user.cookie);

    await openAccounts(page);

    await page.route('**/api/v1/accounts', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          headers: {
            'X-Request-Id': 'e2ereq0000000000001a',
          },
          body: JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: 'Database assertion failure on mobile',
            errorId: 'E2EERR01',
            requestId: 'e2ereq0000000000001a',
            timestamp: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    await page.getByRole('button', { name: /Add Account|Get Started/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();
    await page.getByLabel('Account Name').fill('Mobile Error Account');
    await page.getByLabel('Opening Balance').fill('15000');
    await page.getByLabel('Last 4 Digits').fill('1234');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Toast visible with both buttons
    await expectToast(page, /Ref E2EERR01/);
    const toast = page.locator('[data-sonner-toast]').filter({ hasText: /Ref E2EERR01/ });
    await expect(toast).toBeVisible();
    await expect(toast.getByRole('button', { name: 'Copy ID' })).toBeVisible();
    const debugBtn = toast.getByRole('button', { name: 'Debug' });
    await expect(debugBtn).toBeVisible();

    // Click Debug -> lands on /debug?ref=E2EERR01
    await debugBtn.dispatchEvent('click');
    await page.waitForURL('**/debug?ref=E2EERR01', { timeout: 10000 });
    expect(page.url()).toContain('/debug?ref=E2EERR01');

    // Tap local row copies ref and triggers success toast
    const refBadge = page.getByText('E2EERR01').first();
    await expect(refBadge).toBeVisible();
    await refBadge.click();
    await expectToast(page, /Copied ref E2EERR01/);
  });
});
