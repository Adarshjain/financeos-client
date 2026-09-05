import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedTransactionsDataset } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

test.describe('Reports UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-reports');
    await loginContext(context, currentUser.cookie);
  });

  test('Reports builder journey: empty state -> create KPI -> preview -> edit -> create Table pivot FY -> filter pills -> delete', async ({
    page,
    request,
  }) => {
    test.slow();

    const api = makeApi(currentUser.cookie);
    await seedTransactionsDataset(api);

    // 1. Empty state
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.locator('text=No reports yet')).toBeVisible();

    // 2. Click "New report"
    await page.getByRole('button', { name: /New report/i }).click();
    await page.waitForURL('**/reports/new');
    await expect(page.getByRole('heading', { name: 'Create Report' })).toBeVisible();

    // 3. Name the report and configure KPI
    await page.getByPlaceholder('Report name').fill('UI Spend KPI');

    // Select measure Amount
    await page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first().click();
    await page.getByRole('option', { name: 'Amount' }).click();

    // Click Preview button
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();

    // Save report
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL('**/reports');

    // 4. Card appeared in list with badges
    await expect(page.getByText('UI Spend KPI')).toBeVisible();
    await expect(page.getByText('Transactions').first()).toBeVisible();

    // 5. Open report in edit mode (/reports/[id]) and update description
    await page.getByRole('link', { name: /UI Spend KPI/i }).click();
    await page.waitForURL(/\/reports\/[a-f0-9-]+/);
    await expect(page.getByRole('heading', { name: 'Edit Report' })).toBeVisible();

    await page.getByPlaceholder('Report name').fill('UI Spend KPI Updated');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL('**/reports');
    await expect(page.getByText('UI Spend KPI Updated')).toBeVisible();

    // 6. Create second report: Table Aggregated with Financial Year
    await page.getByRole('button', { name: /New report/i }).click();
    await page.waitForURL('**/reports/new');

    await page.getByPlaceholder('Report name').fill('UI Pivot Table');
    await page.getByRole('tab', { name: 'Table' }).click();
    await page.getByRole('tab', { name: 'Aggregated' }).click();

    // Add row dimension Date @ Financial Year
    await page.getByRole('button', { name: /Add Row/i }).click();
    await page.waitForTimeout(200);

    const rowFieldSelect = page.getByRole('combobox').filter({ hasText: /Select field/i }).first();
    if (await rowFieldSelect.isVisible()) {
      await rowFieldSelect.click();
      await page.getByRole('option', { name: 'Date', exact: true }).click();
    }

    const granSelect = page.getByRole('combobox').filter({ hasText: /Month|Select granularity/i }).first();
    if (await granSelect.isVisible()) {
      await granSelect.click();
      await page.getByRole('option', { name: 'Financial Year' }).click();
    }

    // Add measure Amount
    const addMeasureBtn = page.getByRole('button', { name: /Add Measure/i });
    if (await addMeasureBtn.isVisible()) {
      await addMeasureBtn.click();
      await page.waitForTimeout(200);
      const tableMeasSelect = page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first();
      if (await tableMeasSelect.isVisible()) {
        await tableMeasSelect.click();
        await page.getByRole('option', { name: 'Amount' }).click();
      }
    }

    // Click Preview
    const previewBtn = page.getByRole('button', { name: /Preview|Refresh preview/i }).first();
    if (await previewBtn.isVisible() && await previewBtn.isEnabled()) {
      await previewBtn.click();
      await page.waitForTimeout(500);
    }

    // Save table report
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL('**/reports');
    await expect(page.getByText('UI Pivot Table')).toBeVisible();

    // 7. Filter pills
    await page.getByRole('link', { name: 'KPI', exact: true }).click();
    await page.waitForURL('**/reports?type=KPI');
    await expect(page.getByText('UI Spend KPI Updated')).toBeVisible();
    await expect(page.getByText('UI Pivot Table')).not.toBeVisible();

    await page.getByRole('link', { name: 'Table', exact: true }).click();
    await page.waitForURL('**/reports?type=TABLE');
    await expect(page.getByText('UI Pivot Table')).toBeVisible();
    await expect(page.getByText('UI Spend KPI Updated')).not.toBeVisible();

    await page.getByRole('link', { name: 'All', exact: true }).click();
    await page.waitForURL('**/reports');
    await expect(page.getByText('UI Spend KPI Updated')).toBeVisible();
    await expect(page.getByText('UI Pivot Table')).toBeVisible();

    // 8. Delete reports via confirmation dialog
    while (await page.locator('button:has(svg.lucide-trash-2), svg.lucide-trash-2').first().isVisible()) {
      const deleteTrigger = page.locator('button:has(svg.lucide-trash-2), svg.lucide-trash-2').first();
      await deleteTrigger.click();
      await expect(page.getByRole('heading', { name: 'Delete report' })).toBeVisible();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator('text=No reports yet')).toBeVisible();
  });

  test('Mobile: reports list and navigation (@mobile)', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /New report/i })).toBeVisible();
    await expect(page.locator('text=No reports yet')).toBeVisible();
  });
});
