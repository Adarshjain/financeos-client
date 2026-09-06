import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createReport } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Dashboards UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dashboards');
    await loginContext(context, currentUser.cookie);
  });

  test('Dashboards journey: empty state -> create dashboard -> add widget -> view -> edit expand -> discard modal -> default dashboard on home', async ({
    page,
  }) => {
    test.slow();

    const api = makeApi(currentUser.cookie);

    // Create a saved report to use as a widget
    await createReport(api, {
      name: 'Net Cashflow KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });

    // 1. Dashboards list empty state
    await page.goto('/dashboards');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Dashboards', exact: true })).toBeVisible();
    await expect(page.locator('text=No dashboards yet')).toBeVisible();

    // 2. Click "New dashboard"
    await page.getByRole('button', { name: /New dashboard/i }).click();
    await page.waitForURL('**/dashboards/new');

    // 3. Name the dashboard
    await page.getByPlaceholder('Dashboard name').fill('Executive Dashboard');

    // 4. Click "Add widget" -> Dialog opens
    await page.getByRole('button', { name: /Add widget/i }).click();
    await expect(page.getByRole('heading', { name: 'Add a report widget' })).toBeVisible();

    // Pick the saved report
    await page.getByRole('button', { name: /Net Cashflow KPI/i }).click();

    // 5. Click "Create"
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/dashboards\/[a-f0-9-]+/);
    await page.waitForLoadState('networkidle');

    // 6. View mode: dashboard rendered with title and widget
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
    await expect(page.locator('link[title="Edit report"], a[title="Edit report"]').first()).toBeVisible();
    await expect(page.getByText(/Net Cashflow KPI/i).first()).toBeVisible();

    // 7. Click "Edit" to enter edit mode
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    // Toggle widget width (Expand to full width)
    await page.getByTitle('Expand to full width').first().click();
    await expect(page.getByTitle('Collapse to half width').first()).toBeVisible();

    // Save changes
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Dashboard saved');

    // Verify persisted after reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // 8. Test Discard changes modal on back arrow with dirty state
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByPlaceholder('Dashboard name').fill('Unsaved Name Edit');

    const backBtn = page.locator('button:has(svg.lucide-arrow-left)').first();
    await backBtn.click();
    await expect(page.getByRole('heading', { name: 'Discard changes?' })).toBeVisible();
    await page.getByRole('button', { name: 'Discard', exact: true }).click();

    // Verify it restored view mode
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // Click back from view mode to return to /dashboards list
    await backBtn.click();
    await page.waitForURL('**/dashboards');

    // 9. Set as default dashboard from list
    await page.getByTitle('Set as default').first().click();
    await expectToast(page, 'Set as default');
    await expect(page.getByTitle('Clear default').first()).toBeVisible();

    // 10. Visit `/dashboard` (landing home) -> renders the default dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Executive Dashboard').first()).toBeVisible();
    await expect(page.getByText(/Net Cashflow KPI/i).first()).toBeVisible();
  });

  test('Fresh user on /dashboard sees empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator("text=You don't have a default dashboard yet")).toBeVisible();
    await expect(page.getByRole('button', { name: /Create dashboard/i })).toBeVisible();
  });

});
