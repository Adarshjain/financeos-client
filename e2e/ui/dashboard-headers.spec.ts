import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Dashboard section headers UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dash-headers');
    await loginContext(context, currentUser.cookie);
  });

  async function seedDashboard(name: string, withHeader = false) {
    const api = makeApi(currentUser.cookie);
    const report = await createReport(api, {
      name: 'Headers KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const widgets = [
      ...(withHeader
        ? [{ id: 'h-spend', kind: 'text', title: 'Spending', params: { description: 'Cards only' }, layout: { x: 0, y: 0, w: 100, h: 6 } }]
        : []),
      widget(report.id, { x: 0, y: withHeader ? 6 : 0, w: 50, h: 10 }, null, 'kpi'),
    ];
    return createDashboard(api, { name, isDefault: false, widgets: widgets as never });
  }

  test('add a header with a description, save, reload, then remove it', async ({ page }) => {
    const dashboard = await seedDashboard('Headers journey');
    await page.goto(`/dashboards/${dashboard.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Add header', exact: true }).click();

    // The new header arrives untitled with its title focused.
    const title = page.getByLabel('Header title');
    await expect(title).toBeFocused();
    await title.fill('Investments');
    await page.getByLabel('Header description').fill('Mutual funds and stocks');
    // A header has no width toggle.
    await expect(page.getByTestId('dashboard-header-edit').getByTitle(/width/i)).toHaveCount(0);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Dashboard saved');

    const heading = page.getByRole('heading', { level: 2, name: 'Investments' });
    await expect(heading).toBeVisible();
    await expect(page.getByText('Mutual funds and stocks')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(heading).toBeVisible();
    await expect(page.getByText('Mutual funds and stocks')).toBeVisible();

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Remove header' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Dashboard saved');
    await expect(page.getByRole('heading', { level: 2, name: 'Investments' })).toHaveCount(0);
  });

  test('saving with an untitled header is blocked', async ({ page }) => {
    const dashboard = await seedDashboard('Untitled header');
    await page.goto(`/dashboards/${dashboard.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Add header', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Give every header a title.');
    // Still editing: nothing was saved.
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('@mobile a saved header renders as a full-width heading above the widgets', async ({ page, isMobile }) => {
    const dashboard = await seedDashboard('Header view', true);
    await page.goto(`/dashboards/${dashboard.id}`);
    await page.waitForLoadState('networkidle');

    const header = page.getByTestId('dashboard-header');
    await expect(header.getByRole('heading', { level: 2, name: 'Spending' })).toBeVisible();
    await expect(header.getByText('Cards only')).toBeVisible();
    if (isMobile) await expect(page.getByTestId('dashboard-stack')).toBeVisible();

    // Full width: the header spans the same width as the widget area, and sits above the first widget.
    const area = await (isMobile ? page.getByTestId('dashboard-stack') : page.locator('.react-grid-layout')).boundingBox();
    const box = await header.boundingBox();
    const firstWidget = await page.getByTestId('dashboard-widget').first().boundingBox();
    expect(box!.width).toBeGreaterThan(area!.width * 0.9);
    expect(box!.y + box!.height).toBeLessThanOrEqual(firstWidget!.y + 1);
  });
});
