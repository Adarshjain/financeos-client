import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard } from '../fixtures/seed/reports';
import { builtinWidget } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** The greeting the app should show right now: by the hour in IST, never the browser's zone. */
function istGreeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())) % 24;
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Dashboards list and Home, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-home');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // A known starting point: whatever the account came with is gone.
      const api = makeApi(currentUser.cookie);
      const existing = (await api.GET('/api/v1/dashboards')).data ?? [];
      for (const d of existing) await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: d.id } } });
    });

    const board = (name: string, isDefault: boolean, keys: string[] = ['net_worth']) =>
      createDashboard(makeApi(currentUser.cookie), {
        name,
        isDefault,
        widgets: keys.map((key, i) => builtinWidget(`${name.replace(/\s/g, '-')}-${i}`, key, 100, undefined, { x: 0, y: i * 10, h: 10 })),
      });

    const rowOf = (page: Page, name: string) => page.locator('[data-testid="dashboard-row"]').filter({ hasText: name });
    const openMenu = async (page: Page, name: string) => {
      await rowOf(page, name).getByRole('button', { name: 'More options', exact: true }).click();
    };
    const dashboardCount = async () => ((await makeApi(currentUser.cookie).GET('/api/v1/dashboards')).data ?? []).length;

    // ---- The list ----------------------------------------------------------------------------------------------

    test('list: rows with Default badge and the board’s line, the tabs with counts, and the built-in widgets', async ({ page }) => {
      const catalog = (await makeApi(currentUser.cookie).GET('/api/v1/dashboards/builtins')).data ?? [];
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await board('Ds money', false, ['net_worth']);
      await page.goto('/ds/dashboards');

      await expect(page.getByRole('tab', { name: /^Dashboards\s*·\s*2$/ })).toBeVisible({ timeout: 45_000 });
      await expect(page.getByRole('tab', { name: /^Reports/ })).toBeVisible();
      await expect(rowOf(page, 'Ds home')).toHaveCount(1);
      await expect(rowOf(page, 'Ds home').getByText('Default')).toBeVisible();
      await expect(rowOf(page, 'Ds home').getByText(/^No description · 2 widgets · Updated \d{1,2} \w{3}$/)).toBeVisible();
      await expect(rowOf(page, 'Ds money').getByText('Default')).toHaveCount(0);
      await expect(rowOf(page, 'Ds money').getByText(/^No description · 1 widget · Updated \d{1,2} \w{3}$/)).toBeVisible();

      await expect(page.getByText(`${catalog.length} available · add to any board`)).toBeVisible();
      // The board's name-only chips: every built-in by name, no descriptions.
      for (const b of catalog) await expect(page.getByText(b.label, { exact: true }).filter({ visible: true }).last()).toBeVisible();
      await expect(page.getByText(catalog[0].description, { exact: true })).toHaveCount(0);

      // The Reports tab is the Dinero Reports list, and its Dashboards tab comes back here.
      await page.getByRole('tab', { name: /^Reports/ }).click();
      await expect(page).toHaveURL(/\/ds\/reports/);
      await page.getByRole('tab', { name: /^Dashboards/ }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards$/);
    });

    test('list: the row opens the dashboard, the ⋯ menu offers Edit, Set as default or Clear default, and Delete dashboard', async ({ page }) => {
      const home = await board('Ds home', true);
      const money = await board('Ds money', false);
      await page.goto('/ds/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Set as default', 'Delete dashboard']);
      await page.keyboard.press('Escape');
      await openMenu(page, 'Ds home');
      await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Clear default', 'Delete dashboard']);
      await page.keyboard.press('Escape');

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page).toHaveURL(new RegExp(`/ds/dashboards/${money.id}`));
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds money', { timeout: 45_000 });

      await page.goto('/ds/dashboards');
      await rowOf(page, 'Ds home').getByRole('link', { name: 'Ds home' }).click();
      await expect(page).toHaveURL(new RegExp(`/ds/dashboards/${home.id}$`));
    });

    test('list: Set as default moves the badge and Clear default removes it', async ({ page }) => {
      await board('Ds home', true);
      await board('Ds money', false);
      await page.goto('/ds/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Set as default' }).click();
      await expect(page.getByText('Set as default', { exact: true })).toBeVisible();
      await expect(rowOf(page, 'Ds money').getByText('Default')).toBeVisible();
      await expect(rowOf(page, 'Ds home').getByText('Default')).toHaveCount(0);

      await openMenu(page, 'Ds money');
      await expect(page.getByRole('menuitem', { name: 'Clear default' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Clear default' }).click();
      await expect(page.getByText('Default cleared')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-row"]').getByText('Default', { exact: true })).toHaveCount(0);
    });

    test('list: Delete asks first, Cancel keeps it, Delete dashboard removes it and says so', async ({ page }) => {
      await board('Ds home', true);
      await board('Ds money', false);
      await page.goto('/ds/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Delete dashboard' }).click();
      const dialog = page.getByRole('dialog', { name: 'Delete Ds money?' });
      await expect(dialog.getByText('This cannot be undone. Its widgets go with it; your saved reports stay.')).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await dashboardCount()).toBe(2);

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Delete dashboard' }).click();
      await page.getByRole('dialog', { name: 'Delete Ds money?' }).getByRole('button', { name: 'Delete dashboard' }).click();
      await expect(page.getByText('Dashboard deleted')).toBeVisible();
      await expect(rowOf(page, 'Ds money')).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /^Dashboards\s*·\s*1$/ })).toBeVisible();
      expect(await dashboardCount()).toBe(1);
    });

    test('list: Restore default Home brings Home back as the default, with its toast', async ({ page }) => {
      await board('Ds money', false);
      await page.goto('/ds/dashboards');
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Restore default Home' }).click();
      await expect(page.getByText('Home dashboard restored')).toBeVisible();
      await expect(rowOf(page, 'Home')).toBeVisible();
      await expect(rowOf(page, 'Home').getByText('Default')).toBeVisible();
      // Home exists now: there is nothing to restore.
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toHaveCount(0);
    });

    test('list: with no dashboards it says so, offers New dashboard and Restore default Home', async ({ page }) => {
      await page.goto('/ds/dashboards');
      await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible();
      await page.getByRole('button', { name: 'New dashboard' }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards\/new/);
    });

    // ---- Home --------------------------------------------------------------------------------------------------

    test('Home: the greeting by the hour in IST, the day, and the default dashboard’s widgets under it', async ({ page }) => {
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await page.goto('/ds/dashboard');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(istGreeting(), { timeout: 45_000 });
      const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' }).formatToParts(new Date());
      const get = (t: string) => day.find((p) => p.type === t)!.value;
      await expect(page.getByText(new RegExp(`^${get('weekday')} ${get('day')} ${get('month')}`))).toBeVisible();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
    });

    test('Home: the switcher lists the dashboards, shows the one picked, and ends with View all dashboards', async ({ page }) => {
      await board('Ds home', true, ['net_worth']);
      await board('Ds money', false, ['net_worth', 'upcoming', 'bills_due']);
      await page.goto('/ds/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await expect(page.getByRole('option')).toHaveCount(2);
      await expect(page.getByRole('option', { name: 'Ds home' })).toBeVisible();
      await page.getByRole('option', { name: 'Ds money' }).click();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(3, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await page.getByRole('button', { name: 'View all dashboards' }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards$/);
    });

    test('Home: ⋯ Add widget saves straight to the dashboard, and Undo takes it off again', async ({ page }) => {
      test.slow();
      const home = await board('Home', true, ['net_worth']);
      await page.goto('/ds/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByRole('button', { name: 'Dashboard actions' }).click();
      await expect(page.getByRole('menuitem')).toHaveText(['Add widget', 'Edit dashboard', 'New dashboard']);
      await page.getByRole('menuitem', { name: 'Add widget' }).click();
      const picker = page.getByRole('dialog', { name: /Add widget/ });
      await picker.getByRole('radio', { name: /Upcoming/ }).click();
      await picker.getByRole('button', { name: 'Add to board' }).click();

      await expect(page.getByText('Widget added to Home')).toBeVisible();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 30_000 });
      const saved = async () => (await makeApi(currentUser.cookie).GET('/api/v1/dashboards/{id}', { params: { path: { id: home.id } } })).data!.widgets.length;
      expect(await saved()).toBe(2);

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 30_000 });
      await expect.poll(saved).toBe(1);
    });

    test('Home: ⋯ Edit dashboard opens that dashboard editing, and New dashboard opens the create page', async ({ page }) => {
      const home = await board('Ds home', true);
      await page.goto('/ds/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByRole('button', { name: 'Dashboard actions' }).click();
      await page.getByRole('menuitem', { name: 'Edit dashboard' }).click();
      await expect(page).toHaveURL(new RegExp(`/ds/dashboards/${home.id}`));
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds home', { timeout: 45_000 });

      await page.goto('/ds/dashboard');
      await page.getByRole('button', { name: 'Dashboard actions' }).click();
      await page.getByRole('menuitem', { name: 'New dashboard' }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards\/new/);
    });

    test('Home: a default dashboard with nothing on it says so and offers Add widget', async ({ page }) => {
      await board('Ds home', true, []);
      await page.goto('/ds/dashboard');
      await expect(page.getByText('This dashboard has no widgets yet')).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Add widget' }).click();
      await expect(page.getByRole('dialog', { name: /Add widget/ })).toBeVisible();
    });

    test('Home: with no default dashboard it says so, with four ways on, and Restore default Home brings it back', async ({ page }) => {
      await board('Ds money', false);
      await page.goto('/ds/dashboard');
      await expect(page.getByText('No default dashboard')).toBeVisible({ timeout: 45_000 });
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: 'Create dashboard' })).toHaveAttribute('href', '/ds/dashboards/new');
      await expect(main.getByRole('link', { name: 'View dashboards' })).toHaveAttribute('href', '/ds/dashboards');
      await expect(main.getByRole('link', { name: 'Ask the data' })).toBeVisible();

      await main.getByRole('button', { name: 'Restore default Home' }).click();
      await expect(page.getByText('Home dashboard restored')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(istGreeting(), { timeout: 45_000 });
      await expect(page.getByText('No default dashboard')).toHaveCount(0);
    });
  });
}
