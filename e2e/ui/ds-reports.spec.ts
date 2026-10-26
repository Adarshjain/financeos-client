import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createReport } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

test.describe('/ds Reports list, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-reports');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('list renders grouped by area, type chip filters through the URL, row menu delete can be cancelled', async ({
    page,
  }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await createReport(api, {
      name: 'Ds Spend KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    await createReport(api, {
      name: 'Ds Spend Table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        mode: 'raw',
        columns: ['date', 'description', 'amount'],
        filters: [],
        sort: [{ key: 'date', direction: 'desc' }],
      },
    });

    await page.goto('/ds/reports');
    const table = page.getByRole('table');
    await expect(table.getByText('Ds Spend KPI', { exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      table.getByText('Ds Spend Table', { exact: true })
    ).toBeVisible();
    await expect(table.getByText('Spending', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New report' })).toBeVisible();

    // The tabs and the type chips carry counts over every report.
    // (A new user also gets a starter report, so the totals are not hard-coded.)
    const reportsTab = page.getByRole('tab', { name: /^Reports\s*·\s*\d+$/ });
    await expect(reportsTab).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Dashboards\s*·\s*\d+$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^KPI\s*1$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Table\s*1$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Datasource/ })).toHaveCount(0);

    // A type chip is a URL, applied to the loaded list.
    await page.getByRole('button', { name: /^Table\s*1$/ }).click();
    await expect(page).toHaveURL(/\/ds\/reports\?type=TABLE/);
    // The counts do not change with the chip.
    await expect(page.getByRole('button', { name: /^KPI\s*1$/ })).toBeVisible();
    await expect(reportsTab).toBeVisible();
    await expect(
      table.getByText('Ds Spend Table', { exact: true })
    ).toBeVisible();
    await expect(table.getByText('Ds Spend KPI', { exact: true })).toHaveCount(
      0
    );
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(
      table.getByText('Ds Spend KPI', { exact: true })
    ).toBeVisible();

    // Ask the data lives in the Ask instead card (the rail's link of the same name comes first).
    const ask = page.getByRole('link', { name: 'Ask the data' }).last();
    await expect(page.getByText('Ask instead', { exact: true })).toBeVisible();
    await expect(ask).toHaveAttribute('href', /\/chat\?q=/);

    // Search narrows the loaded list.
    await page.getByPlaceholder('Search reports').fill('KPI');
    await expect(
      table.getByText('Ds Spend Table', { exact: true })
    ).toHaveCount(0);
    await page.getByPlaceholder('Search reports').fill('');

    // Delete asks first; Cancel keeps the report.
    await page
      .getByRole('button', { name: 'Options for Ds Spend KPI', exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText(
        /Dashboards that use it will show the report as unavailable/
      )
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      table.getByText('Ds Spend KPI', { exact: true })
    ).toBeVisible();
  });
});
