import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createReport } from '../fixtures/seed/reports';
import { createCategory, createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** Opens the dropdown named `field` and picks `option`. */
async function pick(
  page: import('@playwright/test').Page,
  field: string,
  option: string
) {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('/ds report editor, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-report-editor');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('creates a chart report with Top N and a breakdown, previews it, saves it, reopens it, changes it and is asked before leaving', async ({
    page,
  }) => {
    test.slow();
    // Two categories with two transactions each, on one account (the sub-rows).
    const api = makeApi(currentUser.cookie);
    const accountName = `Breakdown Bank ${Date.now()}`;
    const account = await createBankAccount(api, { name: accountName });
    const tag = Date.now();
    const food = await createCategory(api, `Bd Food ${tag}`);
    const fuel = await createCategory(api, `Bd Fuel ${tag}`);
    for (const [categoryId, description, amount] of [
      [food.id, 'Breakdown food one', -300],
      [food.id, 'Breakdown food two', -100],
      [fuel.id, 'Breakdown fuel one', -150],
      [fuel.id, 'Breakdown fuel two', -50],
    ] as const) {
      await createTransaction(api, account.id, { amount, description, categoryIds: [categoryId] });
    }

    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText('Unsaved changes')).toHaveCount(0);

    // Configure: a Chart on Transactions, spend by category, top 5 and the rest as Other.
    await page.getByLabel('Report name').fill('Ds editor spend by category');
    await page.getByRole('radio', { name: 'Chart' }).click();
    await pick(page, 'Dimension (X-axis)', 'Category');
    await pick(page, 'Measure (Y-axis)', 'Spend');
    await pick(page, 'Aggregation', 'Sum');
    await page.getByLabel('Show top').fill('5');
    // The toggle is a switch named by its row's label: pressing the label flips it.
    await page.getByText('Group the rest as Other').click();
    await expect(page.getByText('Unsaved changes')).toBeVisible();

    // Breakdown: a chart subtype with sub-rows.
    await pick(page, 'Chart type', 'Breakdown');
    await expect(
      page.getByRole('combobox', { name: 'Sub-rows', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Series (optional split)' })
    ).toHaveCount(0);
    await pick(page, 'Sub-rows', 'Account');
    await page.getByLabel('Sub-rows per row').fill('3');

    // Columns is a multi-select: add Transactions to the default amount and share.
    await page.getByRole('combobox', { name: 'Columns', exact: true }).click();
    await page.getByRole('option', { name: 'Transactions', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox', { name: 'Columns', exact: true })).toContainText('Transactions');

    // Preview runs on demand and shows the ranked rows with their share.
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await expect(page.getByText("Couldn't run the report")).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Txns' })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('columnheader', { name: 'Share' })).toBeVisible();
    await expect(page.getByText(`Bd Food ${tag}`).first()).toBeVisible();
    await expect(page.getByText(`Bd Fuel ${tag}`).first()).toBeVisible();
    await expect(page.getByText('67%').first()).toBeVisible();

    // A press on a row expands its sub-rows; the underlying data opens from the link inside.
    await page.getByText(`Bd Food ${tag}`).first().click();
    await expect(page.getByText(`${accountName} · 2 transactions`)).toBeVisible();
    await page.getByRole('button', { name: 'Underlying data' }).last().click();
    const underlying = page.getByRole('dialog', { name: /^Underlying data/ });
    await expect(underlying.getByText('2 transactions make up this figure')).toBeVisible({ timeout: 45_000 });
    await expect(underlying.getByText('Breakdown food one').first()).toBeVisible();
    await expect(underlying.getByText('Breakdown fuel one')).toHaveCount(0);
    // Opened from a row, the dropdown is on that row's category (not All).
    await expect(underlying.getByRole('button', { name: `Category: Bd Food ${tag}` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(underlying).toHaveCount(0);

    // From the preview header the dialog covers every row; its dropdown narrows them to one category.
    await page.getByRole('button', { name: 'Underlying data' }).first().click();
    await expect(underlying.getByText('4 transactions make up this figure')).toBeVisible({ timeout: 45_000 });
    await expect(underlying.getByText('Breakdown fuel one').first()).toBeVisible();
    await underlying.getByRole('button', { name: 'Category: All' }).click();
    await page.getByRole('option', { name: `Bd Food ${tag}` }).click();
    await expect(underlying.getByText('2 transactions make up this figure')).toBeVisible({ timeout: 45_000 });
    await expect(underlying.getByText('Breakdown food one').first()).toBeVisible();
    await expect(underlying.getByText('Breakdown fuel one')).toHaveCount(0);
    // Escape closes the dialog right after an entry was picked, once the popover is gone.
    await underlying.getByRole('button', { name: `Category: Bd Food ${tag}` }).click();
    await page.getByRole('option', { name: `Bd Fuel ${tag}` }).click();
    await expect(page.getByRole('option', { name: `Bd Fuel ${tag}` })).toHaveCount(0);
    await expect(underlying.getByText('Breakdown fuel one').first()).toBeVisible({ timeout: 45_000 });
    await page.keyboard.press('Escape');
    await expect(underlying).toHaveCount(0);

    await page.getByRole('button', { name: 'Underlying data' }).first().click();
    await expect(underlying.getByText('4 transactions make up this figure')).toBeVisible({ timeout: 45_000 });
    await underlying.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(underlying).toHaveCount(0);

    // Changing the report type starts the preview over; the chart settings are still there on the way back.
    await page.getByRole('radio', { name: 'KPI' }).click();
    await expect(page.getByText('Click Preview to run this report.')).toBeVisible();
    await expect(page.getByText(`Bd Food ${tag}`)).toHaveCount(0);
    await expect(page.getByText('Configuration changed since this result.')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Chart' }).click();
    await expect(page.getByLabel('Show top')).toHaveValue('5');

    // Create writes the report and takes the visitor back to the list it was opened from, which shows it.
    await page.getByRole('button', { name: 'Add report' }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });
    await expect(page.getByRole('table').getByText('Ds editor spend by category', { exact: true })).toBeVisible({ timeout: 45_000 });

    // Reopened from the list: format and datasource are fixed, the saved settings are back.
    await page.goto('/reports');
    await page
      .getByRole('table')
      .getByText('Ds editor spend by category', { exact: true })
      .click();
    await page.waitForURL(/\/reports\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('radio', { name: 'Chart' })).toBeDisabled();
    await expect(
      page.getByRole('combobox', { name: 'Datasource' })
    ).toBeDisabled();
    await expect(
      page.getByRole('combobox', { name: 'Chart type' })
    ).toContainText('Breakdown');
    await expect(page.getByLabel('Show top')).toHaveValue('5');
    await expect(page.getByLabel('Sub-rows per row')).toHaveValue('3');
    await expect(page.getByRole('combobox', { name: 'Columns', exact: true })).toContainText('Transactions');
    // The saved result is already there, run on the server before the first render.
    await expect(page.getByText('Click Preview to run this report.')).toHaveCount(0);
    await expect(page.getByText("Couldn't run the report")).toHaveCount(0);

    // Change something: the label appears, and leaving asks first.
    await page.getByLabel('Show top').fill('8');
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Discard changes?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);

    // Saving goes back to the list without asking about unsaved changes.
    await page.getByRole('button', { name: 'Save report' }).click();
    await page.waitForURL(/\/reports$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The saved Top N stuck.
    await page
      .getByRole('table')
      .getByText('Ds editor spend by category', { exact: true })
      .click();
    await expect(page.getByLabel('Show top')).toHaveValue('8');

    // Opened from the list by a click, a rename saved here shows on the list it goes back to (fresh, not cached).
    await page.getByLabel('Report name').fill('Ds editor renamed report');
    await page.getByRole('button', { name: 'Save report' }).click();
    await page.waitForURL(/\/reports$/);
    await expect(page.getByRole('table').getByText('Ds editor renamed report', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('table').getByText('Ds editor spend by category', { exact: true })).toHaveCount(0);
    await page.getByRole('table').getByText('Ds editor renamed report', { exact: true }).click();
    await page.waitForURL(/\/reports\/[0-9a-f-]{36}$/);

    // Delete asks first; afterwards the list (not a cached copy of it) no longer shows the report.
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete report' })
      .click();
    await page.waitForURL(/\/reports$/);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(
      page
        .getByRole('table')
        .getByText('Ds editor spend by category', { exact: true })
    ).toHaveCount(0);
  });

  test('opens a template prefilled and saves it as a new report', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/reports/new?template=dividend-income-by-fy');
    await expect(page.getByLabel('Report name')).toHaveValue(
      'Dividend income by FY',
      { timeout: 45_000 }
    );
    await expect(
      page.getByRole('combobox', { name: 'Datasource' })
    ).toContainText('Dividends');
    await page.getByRole('button', { name: 'Add report' }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });
  });

  test('opens the rows behind a KPI from the Underlying data link', async ({
    page,
  }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: `Underlying Bank ${Date.now()}` });
    for (const [description, amount] of [
      ['Underlying row Alpha', -100],
      ['Underlying row Beta', -200],
      ['Underlying row Gamma', -300],
    ] as const) {
      await createTransaction(api, account.id, { amount, description });
    }
    const report = await createReport(api, {
      name: 'Ds underlying spend',
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'spend',
        aggregation: 'sum',
        filters: [{ field: 'date', operator: 'this_month' }],
      },
    } as never);

    await page.goto(`/reports/${report.id}`);
    const link = page.getByRole('button', { name: 'Underlying data' });
    await expect(link).toBeVisible({ timeout: 45_000 });

    // From the link in the preview header.
    await link.click();
    const dialog = page.getByRole('dialog', { name: /^Underlying data/ });
    await expect(dialog.getByText('3 transactions make up this figure')).toBeVisible({ timeout: 45_000 });
    for (const name of ['Underlying row Alpha', 'Underlying row Beta', 'Underlying row Gamma']) {
      await expect(dialog.getByText(name).first()).toBeVisible();
    }
    await expect(dialog.getByText('Cards')).toHaveCount(0);
    await expect(dialog.getByText('Open in Transactions')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

  });

  test('tapping a bar of a chart report opens the rows of that bar\'s category', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: `Bar Bank ${Date.now()}` });
    const tag = Date.now();
    const food = await createCategory(api, `Bar Food ${tag}`);
    const fuel = await createCategory(api, `Bar Fuel ${tag}`);
    const rowOf = new Map<string, string>([
      [`Bar Food ${tag}`, `Bar food row ${tag}`],
      [`Bar Fuel ${tag}`, `Bar fuel row ${tag}`],
    ]);
    await createTransaction(api, account.id, { amount: -300, description: `Bar food row ${tag}`, categoryIds: [food.id] });
    await createTransaction(api, account.id, { amount: -100, description: `Bar fuel row ${tag}`, categoryIds: [fuel.id] });
    const report = await createReport(api, {
      name: `Ds bars ${tag}`,
      type: 'CHART',
      datasource: 'transactions',
      definition: {
        chartType: 'bar',
        dimension: { field: 'category' },
        measure: { field: 'spend', aggregation: 'sum' },
        filters: [{ field: 'date', operator: 'this_month' }],
      },
    } as never);

    await page.goto(`/reports/${report.id}`);
    const bars = page.locator('.recharts-bar-rectangle');
    await expect(bars).toHaveCount(2, { timeout: 45_000 });

    // The bar order is the report's; read which category the first bar is from the dialog's entry chip.
    await bars.first().click();
    const dialog = page.getByRole('dialog', { name: /^Underlying data/ });
    const chip = dialog.getByRole('button', { name: /^Category: / });
    await expect(chip).toBeVisible({ timeout: 45_000 });
    const tapped = ((await chip.getAttribute('aria-label')) ?? (await chip.innerText())).replace(/^Category: /, '').trim();
    expect(rowOf.has(tapped)).toBe(true);
    const other = [...rowOf.keys()].find((name) => name !== tapped)!;
    await expect(dialog.getByText('1 transaction makes up this figure')).toBeVisible({ timeout: 45_000 });
    await expect(dialog.getByText(rowOf.get(tapped)!).first()).toBeVisible();
    await expect(dialog.getByText(rowOf.get(other)!)).toHaveCount(0);
  });
  test('warns about a sum that adds up wrong and keeps it from being created until it is fixed', async ({ page }) => {
    test.slow();
    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByLabel('Report name').fill('Ds editor net worth guard');
    await pick(page, 'Datasource', 'Net worth');
    await page.getByRole('radio', { name: 'KPI' }).click();
    await pick(page, 'Measure', 'Value');

    // Net worth Value summed over both sides adds assets and liabilities together: a warning, and Create does nothing.
    const warning = page.getByText("These numbers don't add up");
    await expect(warning).toBeVisible();
    await expect(page.getByText('Value adds assets and liabilities together. Split by Side, or filter it to one value.')).toBeVisible();
    await page.getByRole('button', { name: 'Add report' }).click();
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(/\/reports\/new/);

    // Net value already nets the sides: the warning goes and the report is created.
    await pick(page, 'Measure', 'Net value');
    await expect(warning).toHaveCount(0);
    await page.getByRole('button', { name: 'Add report' }).click();
    await page.waitForURL(/\/reports$/, { timeout: 45_000 });
    // Only the fixed one was written: the blocked Create made nothing.
    await expect(page.getByRole('table').getByText('Ds editor net worth guard', { exact: true })).toHaveCount(1, { timeout: 45_000 });
  });
});
