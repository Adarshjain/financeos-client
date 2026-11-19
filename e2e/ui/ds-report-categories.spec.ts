import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createReport, seedCategoriesDataset } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

/** Opens the dropdown named `field` and picks `option`. */
async function pick(page: import('@playwright/test').Page, field: string, option: string) {
  // The dropdown picked from just before is still closing: wait until its options are gone.
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('/ds report categories, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-report-categories');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a new transactions report starts with the "Counts as spend or income" filter, which can be removed', async ({ page }) => {
    test.slow();
    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    const chip = page.getByText('Counts as spend or income · true');
    await expect(chip).toBeVisible();
    // A datasource without the field starts with no such filter, and coming back starts it again.
    await pick(page, 'Datasource', 'Dividends');
    await expect(chip).toHaveCount(0);
    await pick(page, 'Datasource', 'Transactions');
    await expect(chip).toBeVisible();
  });

  test('choosing Tag as the split shows the tag note, and no other field does', async ({ page }) => {
    test.slow();
    const note = 'A transaction with more than one tag is counted under each tag.';
    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByRole('radio', { name: 'Chart' }).click();
    await expect(page.getByText(note)).toHaveCount(0);
    await pick(page, 'Dimension (X-axis)', 'Category');
    await expect(page.getByText(note)).toHaveCount(0);
    await pick(page, 'Dimension (X-axis)', 'Tag');
    await expect(page.getByText(note)).toBeVisible();
    await pick(page, 'Dimension (X-axis)', 'Category');
    await expect(page.getByText(note)).toHaveCount(0);
    await pick(page, 'Series (optional split)', 'Tag');
    await expect(page.getByText(note)).toBeVisible();
  });

  for (const [id, name, chartType] of [
    ['spend-by-category-and-sub-category', 'Spend by category and sub-category', 'Breakdown'],
    ['category-spend-by-month', 'Category spend by month', 'Stacked bar'],
    ['income-by-category', 'Income by category', 'Bar'],
  ] as const) {
    test(`the "${name}" template opens from Start from a template`, async ({ page }) => {
      test.slow();
      await page.goto('/reports');
      await page.getByRole('link', { name: `Use ${name}` }).click();
      await expect(page).toHaveURL(new RegExp(`/reports/new\\?template=${id}`), { timeout: 45_000 });
      await expect(page.getByLabel('Report name')).toHaveValue(name, { timeout: 45_000 });
      await expect(page.getByRole('combobox', { name: 'Datasource' })).toContainText('Transactions');
      await expect(page.getByRole('combobox', { name: 'Chart type' })).toContainText(chartType);
      await expect(page.getByText('Counts as spend or income · true')).toBeVisible();
    });
  }

  test('drilling into a category bar offers Open in Transactions, which lands on Transactions filtered to that category', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const seed = await seedCategoriesDataset(api);
    const report = await createReport(api, {
      name: `Ds category bars ${Date.now()}`,
      type: 'CHART',
      datasource: 'transactions',
      definition: {
        chartType: 'bar',
        dimension: { field: 'category' },
        measure: { field: 'spend', aggregation: 'sum' },
        order: 'value_desc',
        filters: [
          { field: 'date', operator: 'this_month' },
          { field: 'countsInTotals', operator: 'is', value: true },
        ],
      },
    } as never);

    await page.goto(`/reports/${report.id}`);
    const bars = page.locator('[data-bar]');
    // Food, Transport and Uncategorized.
    await expect(bars).toHaveCount(3, { timeout: 45_000 });

    // Highest first: the Food bar.
    await bars.first().click();
    const dialog = page.getByRole('dialog', { name: /^Underlying data/ });
    await expect(dialog.getByText(seed.descriptions.foodOthers).first()).toBeVisible({ timeout: 45_000 });
    const open = dialog.getByRole('link', { name: 'Open in Transactions' });
    await expect(open).toBeVisible({ timeout: 45_000 });
    await expect(open).toHaveAttribute('href', '/transactions?period=this_month&category=food');

    await open.click();
    await expect(page).toHaveURL(/\/transactions\?period=this_month&category=food$/, { timeout: 45_000 });
    await expect(dialog).toHaveCount(0);
    // The list is that category's rows only.
    await expect(page.getByText(seed.descriptions.foodOthers).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(seed.descriptions.cabs)).toHaveCount(0);
    await expect(page.getByText(seed.descriptions.selfTransfer)).toHaveCount(0);
  });
});
