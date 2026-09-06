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
    const rowFieldSelect = page.getByRole('combobox').filter({ hasText: /Select field/i }).first();
    await rowFieldSelect.click();
    await page.getByRole('option', { name: 'Date', exact: true }).click();
    const granSelect = page.getByRole('combobox').filter({ hasText: /Month|Select granularity/i }).first();
    await granSelect.click();
    await page.getByRole('option', { name: 'Financial Year' }).click();
    await expect(page.getByRole('combobox').filter({ hasText: 'Financial Year' }).first()).toBeVisible();

    // Add measure Amount
    await page.getByRole('button', { name: /Add Measure/i }).click();
    const tableMeasSelect = page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first();
    await tableMeasSelect.click();
    await page.getByRole('option', { name: 'Amount' }).click();

    // Preview runs on demand: the placeholder text gives way to a result.
    await expect(page.getByText('Click Preview to run this report.')).toBeVisible();
    await page.getByRole('button', { name: /^Preview$|Refresh preview/i }).first().click();
    await expect(page.getByText('Click Preview to run this report.')).not.toBeVisible();

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
      await expect(page.getByRole('heading', { name: 'Delete report' })).not.toBeVisible();
    }

    await expect(page.locator('text=No reports yet')).toBeVisible();
  });

});
