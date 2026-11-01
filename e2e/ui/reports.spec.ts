import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedTransactionsDataset } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

/** Opens the dropdown named `field` and picks `option`. */
async function pick(page: Page, field: string, option: string) {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('Reports UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-reports');
    await loginContext(context, currentUser.cookie);
  });

  test('Reports builder journey: empty state -> create KPI -> preview -> edit -> create Table pivot FY -> list -> delete', async ({
    page,
  }) => {
    test.slow();

    const api = makeApi(currentUser.cookie);
    await seedTransactionsDataset(api);

    // 1. Empty state
    await page.goto('/reports');
    await expect(page.getByText('No reports yet')).toBeVisible({ timeout: 45_000 });

    // 2. Add report
    await page.getByRole('link', { name: 'Add report' }).first().click();
    await page.waitForURL('**/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });

    // 3. Name the report and configure KPI
    await page.getByLabel('Report name').fill('UI Spend KPI');
    await page.getByRole('radio', { name: 'KPI' }).click();
    await pick(page, 'Measure', 'Amount');

    // Preview, then save
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Add report', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });

    // 4. The report appeared in the list under its area
    const table = page.getByRole('table');
    await expect(table.getByText('UI Spend KPI', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(table.getByText('Spending', { exact: true })).toBeVisible();

    // 5. Open the report (/reports/[id]) and rename it
    await table.getByText('UI Spend KPI', { exact: true }).click();
    await page.waitForURL(/\/reports\/[0-9a-f-]{36}$/);
    await page.getByLabel('Report name').fill('UI Spend KPI Updated');
    await page.getByRole('button', { name: 'Save report', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });
    await expect(table.getByText('UI Spend KPI Updated', { exact: true })).toBeVisible({ timeout: 45_000 });

    // 6. Create a second report: Table Aggregated with Financial Year
    await page.getByRole('link', { name: 'Add report' }).first().click();
    await page.waitForURL('**/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByLabel('Report name').fill('UI Pivot Table');
    await page.getByRole('radio', { name: 'Table' }).click();
    await page.getByRole('radio', { name: 'Aggregated' }).click();

    // Group by Date at Financial Year
    await page.getByRole('button', { name: 'Add group', exact: true }).click();
    await page.getByRole('combobox', { name: 'Group by', exact: true }).first().click();
    await page.getByRole('option', { name: 'Date', exact: true }).click();
    await page.getByRole('combobox', { name: 'Group by', exact: true }).nth(1).click();
    await page.getByRole('option', { name: 'Financial year' }).click();
    await expect(page.getByRole('combobox', { name: 'Group by', exact: true }).nth(1)).toContainText('Financial year');

    // Add measure Amount
    await page.getByRole('button', { name: 'Add measure', exact: true }).click();
    await pick(page, 'Measures', 'Amount');

    // Preview runs on demand: the placeholder text gives way to a result.
    await expect(page.getByText('Click Preview to run this report.')).toBeVisible();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText('Click Preview to run this report.')).not.toBeVisible({ timeout: 45_000 });

    // Save the table report
    await page.getByRole('button', { name: 'Add report', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });
    await expect(table.getByText('UI Pivot Table', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(table.getByText('UI Spend KPI Updated', { exact: true })).toBeVisible();

    // 7. Delete the reports via the confirmation dialog
    for (const name of ['UI Spend KPI Updated', 'UI Pivot Table']) {
      await page.getByRole('button', { name: `Options for ${name}`, exact: true }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 30_000 });
    }

    await expect(page.getByText('No reports yet')).toBeVisible();
  });
});
