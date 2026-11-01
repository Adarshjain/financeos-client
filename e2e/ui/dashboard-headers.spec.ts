import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

const openEditing = async (page: Page, id: string, name: string) => {
  await page.goto(`/dashboards/${id}?edit=1`);
  await expect(page.getByLabel('Dashboard name')).toHaveValue(name, { timeout: 45_000 });
};

// The top bar's + in edit mode offers Add widget and Add header.
const addHeader = async (page: Page) => {
  await page.getByRole('button', { name: 'Add', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Add header', exact: true }).click();
};

const save = async (page: Page) => {
  await page.getByRole('button', { name: 'Save dashboard', exact: true }).click();
  await expect(page.getByText('Dashboard saved')).toBeVisible();
};

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
    await openEditing(page, dashboard.id, 'Headers journey');
    await addHeader(page);

    // The new header arrives untitled with its title focused.
    const title = page.getByLabel('Header', { exact: true });
    await expect(title).toBeFocused();
    await title.fill('Investments');
    await page.getByTestId('dashboard-header-edit').getByLabel('Description').fill('Mutual funds and stocks');
    // A header has no resize handle: only the KPI widget does.
    await expect(page.locator('[data-widget-grid-resize]')).toHaveCount(1);

    await save(page);

    const heading = page.getByRole('heading', { level: 2, name: 'Investments' });
    await expect(heading).toBeVisible();
    await expect(page.getByText('Mutual funds and stocks')).toBeVisible();

    await page.reload();
    await expect(heading).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Mutual funds and stocks')).toBeVisible();

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: /Remove header/ }).click();
    await save(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Investments' })).toHaveCount(0);
  });

  test('a new header lands on top and pushes the existing widgets down', async ({ page }) => {
    const dashboard = await seedDashboard('Header on top');
    await openEditing(page, dashboard.id, 'Header on top');
    await addHeader(page);
    await page.getByLabel('Header', { exact: true }).fill('Summary');
    await save(page);

    const saved = await makeApi(currentUser.cookie).GET('/api/v1/dashboards/{id}', { params: { path: { id: dashboard.id } } });
    const header = saved.data!.widgets.find((w) => w.kind === 'text')!;
    const kpi = saved.data!.widgets.find((w) => w.kind !== 'text')!;
    expect(header.layout.y).toBe(0);
    expect(kpi.layout.y).toBe(header.layout.h);
    // The heading renders above the KPI.
    const headingBox = (await page.getByRole('heading', { level: 2, name: 'Summary' }).boundingBox())!;
    const kpiBox = (await page.getByTestId('dashboard-widget').first().boundingBox())!;
    expect(headingBox.y).toBeLessThan(kpiBox.y);
  });

  test('saving with an untitled header is blocked', async ({ page }) => {
    const dashboard = await seedDashboard('Untitled header');
    await openEditing(page, dashboard.id, 'Untitled header');
    await addHeader(page);
    await page.getByRole('button', { name: 'Save dashboard', exact: true }).click();
    await expect(page.getByText('Give this header a title.')).toBeVisible();
    // Still editing: nothing was saved.
    await expect(page.getByRole('button', { name: 'Save dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('Dashboard saved')).toHaveCount(0);
    const saved = await makeApi(currentUser.cookie).GET('/api/v1/dashboards/{id}', { params: { path: { id: dashboard.id } } });
    expect(saved.data!.widgets.some((w) => w.kind === 'text')).toBe(false);
  });

  test('@mobile an existing header title and description can be edited by tapping into them', async ({ page, isMobile }) => {
    const dashboard = await seedDashboard('Header edit', true);
    await openEditing(page, dashboard.id, 'Header edit');

    // Typed with the keyboard, not fill(): the input must really take focus from a tap.
    const title = page.getByLabel('Header', { exact: true });
    if (isMobile) await title.tap();
    else await title.click();
    await expect(title).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.type(' 2026');
    await expect(title).toHaveValue('Spending 2026');

    const description = page.getByTestId('dashboard-header-edit').getByLabel('Description');
    if (isMobile) await description.tap();
    else await description.click();
    await expect(description).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.type(' and UPI');
    await expect(description).toHaveValue('Cards only and UPI');

    await save(page);
    const header = page.getByTestId('dashboard-header');
    await expect(header.getByRole('heading', { level: 2, name: 'Spending 2026' })).toBeVisible();
    await expect(header.getByText('Cards only and UPI')).toBeVisible();
  });

  test('@mobile a saved header renders as a full-width heading above the widgets', async ({ page }) => {
    const dashboard = await seedDashboard('Header view', true);
    await page.goto(`/dashboards/${dashboard.id}`);

    const header = page.getByTestId('dashboard-header');
    await expect(header.getByRole('heading', { level: 2, name: 'Spending' })).toBeVisible({ timeout: 45_000 });
    await expect(header.getByText('Cards only')).toBeVisible();
    await expect(page.getByTestId('dashboard-widget').first()).toBeVisible();

    // Full width: the header spans the same width as the widget grid, and sits above the first widget.
    const area = await page.locator('[data-widget-grid-item][data-width="full"]').first().boundingBox();
    const grid = await page.locator('[data-widget-grid-item]').first().locator('xpath=..').boundingBox();
    const box = await header.boundingBox();
    const firstWidget = await page.getByTestId('dashboard-widget').first().boundingBox();
    expect(box!.width).toBeGreaterThan(Math.max(area!.width, grid!.width * 0.9) * 0.9);
    expect(box!.y + box!.height).toBeLessThanOrEqual(firstWidget!.y + 1);
  });
});
