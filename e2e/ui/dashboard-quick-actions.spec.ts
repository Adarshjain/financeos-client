import type { Page } from '@playwright/test';

import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

async function openHomeMenu(page: Page) {
  await page.getByRole('button', { name: 'Dashboard actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Add widget' })).toBeVisible();
}

test.describe('Dashboard quick actions: Home menu and the dashboards list (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dash-quick');
    await loginContext(context, currentUser.cookie);
  });

  async function seededHome() {
    const api = makeApi(currentUser.cookie);
    // The first read of the dashboards seeds Home as the default.
    const list = await api.GET('/api/v1/dashboards');
    expectStatus(list, 200);
    return { api, home: list.data!.find((d) => d.name === 'Home')! };
  }

  test('@mobile Add widget from Home saves the picked report at once, below the rest, without leaving Home', async ({ page }) => {
    const { api, home } = await seededHome();
    const report = await createReport(api, {
      name: 'Quick KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });

    await page.goto('/legacy/dashboard');
    await openHomeMenu(page);
    await page.getByRole('menuitem', { name: 'Add widget' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add a widget' })).toBeVisible();
    await dialog.getByRole('button', { name: /Quick KPI/ }).click();
    await expectToast(page, 'Widget added to Home');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Quick KPI', level: 3 })).toBeVisible();
    await expect(page).toHaveURL(/\/legacy\/dashboard$/);

    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } });
    expectStatus(after, 200);
    const widgets = after.data!.widgets;
    expect(widgets).toHaveLength(home.widgets.length + 1);
    const added = widgets.find((w) => w.reportId === report.id)!;
    const bottom = Math.max(...home.widgets.map((w) => w.layout.y + w.layout.h));
    expect(added.layout.y).toBe(bottom);
  });

  test('@mobile Edit dashboard edits Home in place; a new header lands on top; Save returns to the Home view', async ({ page }) => {
    const { api, home } = await seededHome();

    await page.goto('/legacy/dashboard');
    await openHomeMenu(page);
    await page.getByRole('menuitem', { name: 'Edit dashboard' }).click();
    await expect(page.getByPlaceholder('Dashboard name')).toHaveValue('Home');
    await expect(page.getByRole('button', { name: /Switch dashboard/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/legacy\/dashboard$/);

    await page.getByRole('button', { name: 'Add header', exact: true }).click();
    const title = page.getByLabel('Header title');
    await expect(title).toBeFocused();
    await title.fill('Top header');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Dashboard saved');

    await expect(page.getByRole('button', { name: 'Switch dashboard, current: Home' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Top header' })).toBeVisible();
    await expect(page).toHaveURL(/\/legacy\/dashboard$/);

    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } });
    expectStatus(after, 200);
    const header = after.data!.widgets.find((w) => w.kind === 'text')!;
    expect(header.layout.y).toBe(0);
    for (const w of after.data!.widgets.filter((x) => x.kind !== 'text')) {
      expect(w.layout.y).toBeGreaterThanOrEqual(header.layout.h);
    }
  });

  test('Set as default from Home makes the shown dashboard the one Home opens on; New dashboard goes to the create page', async ({ page }) => {
    const { api } = await seededHome();
    const report = await createReport(api, {
      name: 'Second KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const second = await createDashboard(api, {
      name: 'Second board',
      isDefault: false,
      widgets: [widget(report.id, { x: 0, y: 0, w: 100, h: 4 }, null)],
    });

    await page.goto('/legacy/dashboard');
    await openHomeMenu(page);
    // Home is already the default.
    await expect(page.getByRole('menuitem', { name: 'Set as default' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'New dashboard' })).toHaveAttribute('href', '/legacy/dashboards/new');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Switch dashboard, current: Home/ }).click();
    await page.getByRole('menuitem', { name: 'Second board' }).click();
    await openHomeMenu(page);
    await page.getByRole('menuitem', { name: 'Set as default' }).click();
    await expectToast(page, 'Set as default');
    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: second.id } } });
    expect(after.data!.isDefault).toBe(true);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Switch dashboard, current: Second board' })).toBeVisible();
    await openHomeMenu(page);
    await page.getByRole('menuitem', { name: 'New dashboard' }).click();
    await page.waitForURL('**/legacy/dashboards/new');
  });

  test('Dashboards list: clicking a card opens the dashboard, Edit opens it in edit mode, the star stays on the list', async ({ page }) => {
    const { home } = await seededHome();
    const card = () => page.locator('div.flex-col.gap-3', { has: page.getByRole('link', { name: 'Home', exact: true }) });

    await page.goto('/legacy/dashboards');
    // Anywhere on the card, not just the title: click where the "widgets · Updated" line is, as a person would
    // (the title link's overlay covers the card, so a locator click on the text is reported as intercepted).
    const meta = (await card().getByText(/widgets · Updated/).boundingBox())!;
    await page.mouse.click(meta.x + meta.width / 2, meta.y + meta.height / 2);
    await page.waitForURL(`**/legacy/dashboards/${home.id}`);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);

    await page.goto('/legacy/dashboards');
    await card().getByTitle('Clear default').click();
    await expectToast(page, 'Default cleared');
    await expect(page).toHaveURL(/\/legacy\/dashboards$/);

    await card().getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Dashboard name')).toHaveValue('Home');
    // The ?edit flag is dropped once the editor opens, so a reload shows the dashboard.
    await expect(page).toHaveURL(new RegExp(`/legacy/dashboards/${home.id}$`));
  });
});
