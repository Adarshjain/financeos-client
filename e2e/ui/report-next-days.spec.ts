import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

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
    await expect(page.getByRole('heading', { name: 'Create Report' })).toBeVisible();
    await page.getByPlaceholder('Report name').fill('Next days spend');
    await page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first().click();
    await page.getByRole('option', { name: 'Amount' }).click();

    // Add a filter rule on Date and switch its operator to "Next N days".
    await page.getByRole('button', { name: /Add filter rule/i }).click();
    const filterRow = page.locator('div.group.relative.flex-wrap').first();
    await filterRow.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: 'Date', exact: true }).click();
    await filterRow.getByRole('combobox').nth(1).click();
    await expect(page.getByRole('option', { name: 'Last N days', exact: true })).toBeVisible();
    await page.getByRole('option', { name: 'Next N days', exact: true }).click();

    // The operator takes an amount (1 by default).
    const amount = filterRow.getByPlaceholder('Amount');
    await expect(amount).toHaveValue('1');
    await amount.fill('14');

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL('**/reports');

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
    await expect(page.getByText('Copy me', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Duplicate report' }).first().click();
    await expect(page.getByText('Copy me (copy)')).toBeVisible();
    const names = ((await api.GET('/api/v1/reports')).data ?? []).map((r) => r.name);
    expect(names).toContain('Copy me');
    expect(names).toContain('Copy me (copy)');
  });
});
