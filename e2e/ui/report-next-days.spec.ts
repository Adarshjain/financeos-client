import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

/** Opens the dropdown named `field` and picks `option`. */
async function pick(page: Page, field: string, option: string) {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('Reports: next N days preset and duplicate (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-report-next');
    await loginContext(context, currentUser.cookie);
  });

  test('a date filter offers "Next N days" with an amount, and the report saves and previews with it', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);

    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByLabel('Report name').fill('Next days spend');
    await pick(page, 'Measure', 'Amount');

    // Add a filter on Date and switch its operator to "Next N days".
    await page.getByRole('button', { name: 'Add filter', exact: true }).click();
    await pick(page, 'Field', 'Date');
    await page.getByRole('combobox', { name: 'Operator', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Last N days', exact: true })).toBeVisible();
    await page.getByRole('option', { name: 'Next N days', exact: true }).click();

    // The operator takes an amount (1 by default).
    const amount = page.getByRole('textbox', { name: 'Amount' }).or(page.getByRole('spinbutton', { name: 'Amount' }));
    await expect(amount).toHaveValue('1');
    await amount.fill('14');
    await page.getByRole('button', { name: 'Apply filter' }).click();

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Add report', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });

    const summary = ((await api.GET('/api/v1/reports')).data ?? []).find((r) => r.name === 'Next days spend');
    expect(summary).toBeTruthy();
    const saved = (await api.GET('/api/v1/reports/{id}', { params: { path: { id: summary!.id } } })).data;
    const filters = (saved!.definition as { filters: { field: string; operator: string; value: unknown }[] }).filters;
    expect(filters.some((f) => f.operator === 'next_x_days' && JSON.stringify(f.value) === JSON.stringify({ amount: 14 }))).toBe(true);
  });

  test('the reports list duplicates a report as "<name> (copy)"', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const created = await api.POST('/api/v1/reports', {
      body: {
        name: 'Copy me',
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      } as never,
    });
    expect(created.response.status).toBe(201);

    await page.goto('/reports');
    const table = page.getByRole('table');
    await expect(table.getByText('Copy me', { exact: true })).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Options for Copy me', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(table.getByText('Copy me (copy)', { exact: true })).toBeVisible({ timeout: 30_000 });
    const names = ((await api.GET('/api/v1/reports')).data ?? []).map((r) => r.name);
    expect(names).toContain('Copy me');
    expect(names).toContain('Copy me (copy)');
  });
});
