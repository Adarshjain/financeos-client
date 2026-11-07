import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createReport } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

test.describe('Dashboard quick actions: Home switcher (@ui)', () => {
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
    test.slow();
    const { api, home } = await seededHome();
    const report = await createReport(api, {
      name: 'Quick KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });

    await page.goto('/home');
    await expect(page.getByTestId('dashboard-widget').first()).toBeVisible({ timeout: 45_000 });
    await page.getByTestId('home-switch').click();
    await page.getByRole('button', { name: 'Add widget', exact: true }).click();
    const picker = page.getByRole('dialog', { name: /Add widget/ });
    await picker.getByRole('tab', { name: /My reports/ }).click();
    await picker.getByRole('radio', { name: /Quick KPI/ }).click();
    await picker.getByRole('button', { name: 'Add to board' }).click();
    await expect(page.getByText('Widget added to Home')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(home.widgets.length + 1, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/home$/);

    const after = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } });
    expectStatus(after, 200);
    const widgets = after.data!.widgets;
    expect(widgets).toHaveLength(home.widgets.length + 1);
    const added = widgets.find((w) => w.reportId === report.id)!;
    const bottom = Math.max(...home.widgets.map((w) => w.layout.y + w.layout.h));
    expect(added.layout.y).toBe(bottom);
  });
});
