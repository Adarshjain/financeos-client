import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createCreditCard } from '../fixtures/seed/accounts';
import { seedCardBill, seedDueSoonLoan } from '../fixtures/seed/obligations';
import { createDashboard } from '../fixtures/seed/reports';
import { builtinWidget } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

// The dashboard actions at the foot of the Home switcher's dropdown
const SWITCHER_ACTIONS = /^(Add widget|Set as default|Edit dashboard|Add dashboard|View all dashboards)$/;
// Buttons for the actions that act in place, links for the ones that open another page, in the order shown.
const switcherActions = (page: Page) =>
  page.getByRole('button', { name: SWITCHER_ACTIONS }).or(page.getByRole('link', { name: SWITCHER_ACTIONS }));

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

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

    // The list is a table like Reports: a row is a button whose text starts with the dashboard's name.
    const rowOf = (page: Page, name: string) => page.getByRole('table').getByRole('button').filter({ hasText: new RegExp(`^${name}`) });
    const openMenu = async (page: Page, name: string) => {
      await page.getByRole('button', { name: `Options for ${name}`, exact: true }).click();
    };
    /** The Default badge (desktop column) or the phone row's "Default ·" line: whichever is visible. */
    const defaultMark = (page: Page, name: string) => rowOf(page, name).getByText(/^Default( ·.*)?$/).filter({ visible: true });
    const dashboardCount = async () => ((await makeApi(currentUser.cookie).GET('/api/v1/dashboards')).data ?? []).length;

    // ---- The list ----------------------------------------------------------------------------------------------

    test('list: a table of dashboards with Default marked, the tabs with counts, search, and no built-in widgets card', async ({ page }) => {
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await board('Ds money', false, ['net_worth']);
      await page.goto('/dashboards');

      await expect(page.getByRole('tab', { name: /^Dashboards$/ })).toBeVisible({ timeout: 45_000 });
      await expect(page.getByRole('tab', { name: /^Reports/ })).toBeVisible();
      await expect(rowOf(page, 'Ds home')).toHaveCount(1);
      await expect(defaultMark(page, 'Ds home')).toHaveCount(1);
      await expect(defaultMark(page, 'Ds money')).toHaveCount(0);
      if (viewport.width >= 1024) {
        for (const column of ['Dashboard', 'Widgets', 'Default', 'Updated']) await expect(page.getByRole('table').getByText(column, { exact: true }).first()).toBeVisible();
        await expect(rowOf(page, 'Ds home').getByText('2', { exact: true })).toBeVisible();
        await expect(rowOf(page, 'Ds money').getByText('1', { exact: true })).toBeVisible();
      } else {
        await expect(rowOf(page, 'Ds home').getByText(/^Default · 2 widgets · updated /)).toBeVisible();
        await expect(rowOf(page, 'Ds money').getByText(/^1 widget · updated /)).toBeVisible();
      }
      await expect(page.getByText('Built-in widgets')).toHaveCount(0);
      await expect(page.getByText(/available · add to any board/)).toHaveCount(0);

      // Search narrows the rows.
      await page.getByPlaceholder('Search').fill('money');
      await expect(rowOf(page, 'Ds home')).toHaveCount(0);
      await expect(rowOf(page, 'Ds money')).toHaveCount(1);
      await page.getByPlaceholder('Search').fill('zzz');
      await expect(page.getByText('No dashboards match')).toBeVisible();
      // The empty state's action (the field has its own clear button too).
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await expect(rowOf(page, 'Ds home')).toHaveCount(1);

      // The Reports tab is the Dinero Reports list, and its Dashboards tab comes back here.
      await page.getByRole('tab', { name: /^Reports/ }).click();
      await expect(page).toHaveURL(/\/reports/);
      await page.getByRole('tab', { name: /^Dashboards/ }).click();
      await expect(page).toHaveURL(/\/dashboards$/);
    });

    test('list: the row opens the dashboard, the ⋯ menu offers Edit, Set as default or Clear default, and Delete dashboard', async ({ page }) => {
      const home = await board('Ds home', true);
      const money = await board('Ds money', false);
      await page.goto('/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Set as default', 'Delete dashboard']);
      await page.keyboard.press('Escape');
      await openMenu(page, 'Ds home');
      await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Clear default', 'Delete dashboard']);
      await page.keyboard.press('Escape');

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboards/${money.id}`));
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds money', { timeout: 45_000 });

      await page.goto('/dashboards');
      await rowOf(page, 'Ds home').click();
      await expect(page).toHaveURL(new RegExp(`/dashboards/${home.id}$`));
    });

    test('list: Set as default moves the badge and Clear default removes it', async ({ page }) => {
      await board('Ds home', true);
      await board('Ds money', false);
      await page.goto('/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Set as default' }).click();
      await expect(page.getByText('Default dashboard set', { exact: true })).toBeVisible();
      await expect(defaultMark(page, 'Ds money')).toHaveCount(1);
      await expect(defaultMark(page, 'Ds home')).toHaveCount(0);

      await openMenu(page, 'Ds money');
      await expect(page.getByRole('menuitem', { name: 'Clear default' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Clear default' }).click();
      await expect(page.getByText('Default cleared')).toBeVisible();
      await expect(defaultMark(page, 'Ds money')).toHaveCount(0);
      await expect(defaultMark(page, 'Ds home')).toHaveCount(0);
    });

    test('list: Delete asks first, Cancel keeps it, Delete dashboard removes it and says so', async ({ page }) => {
      await board('Ds home', true);
      await board('Ds money', false);
      await page.goto('/dashboards');
      await expect(rowOf(page, 'Ds money')).toBeVisible({ timeout: 45_000 });

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Delete dashboard' }).click();
      const dialog = page.getByRole('dialog', { name: 'Delete Ds money?' });
      await expect(dialog.getByText("Its widgets go with it; your saved reports stay. This can't be undone.")).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await dashboardCount()).toBe(2);

      await openMenu(page, 'Ds money');
      await page.getByRole('menuitem', { name: 'Delete dashboard' }).click();
      await page.getByRole('dialog', { name: 'Delete Ds money?' }).getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('Dashboard deleted')).toBeVisible();
      await expect(rowOf(page, 'Ds money')).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /^Dashboards$/ })).toBeVisible();
      expect(await dashboardCount()).toBe(1);
    });

    test('list: Restore default Home brings Home back as the default, with its toast', async ({ page }) => {
      await board('Ds money', false);
      await page.goto('/dashboards');
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Restore default Home' }).click();
      await expect(page.getByText('Home dashboard restored')).toBeVisible();
      await expect(rowOf(page, 'Home')).toBeVisible();
      await expect(defaultMark(page, 'Home')).toHaveCount(1);
      // Home exists now: there is nothing to restore.
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toHaveCount(0);
    });

    test('list: with no dashboards it says so, offers Add dashboard and Restore default Home', async ({ page }) => {
      await page.goto('/dashboards');
      await expect(page.getByText('No dashboards yet')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible();
      await page.getByRole('main').getByRole('link', { name: 'Add dashboard' }).click();
      await expect(page).toHaveURL(/\/dashboards\/new/);
    });

    // ---- Home --------------------------------------------------------------------------------------------------

    test('Home: no greeting or page title; the switcher sits in the top bar with no ⋯ menu and the widgets start the page', async ({ page }) => {
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await page.goto('/dashboard');
      await expect(page).toHaveTitle('Home · FinanceOS');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
      await expect(page.getByText(/^Good (morning|afternoon|evening)/)).toHaveCount(0);
      await expect(page.getByText(/synced|things? needs? you/)).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
      const bar = page.getByRole('banner');
      await expect(bar.getByTestId('home-switch')).toBeVisible();
      await expect(bar.getByRole('button', { name: 'Dashboard actions' })).toHaveCount(0);
      // Nothing above the widgets in the page body.
      await expect(page.getByRole('main').locator(':scope > *').first().getByTestId('dashboard-widget').first()).toBeVisible();
    });

    test('Home: no widget has an "Open ›" link; the ⋮ menu is the way to its page', async ({ page }) => {
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
      await expect(page.getByRole('main').getByRole('link', { name: /^Open/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Widget options' }).first()).toBeVisible();
    });

    test('Home: the widgets stack in one column on a phone', async ({ page }) => {
      test.skip(viewport.width >= 1024, 'phone only');
      await board('Ds home', true, ['net_worth', 'upcoming']);
      await page.goto('/dashboard');
      const widgets = page.getByTestId('dashboard-widget');
      await expect(widgets).toHaveCount(2, { timeout: 45_000 });
      // Streaming renders them hidden behind loading.tsx first; measure once they are revealed.
      await expect(widgets.nth(1)).toBeVisible();
      const [a, b] = [await widgets.nth(0).boundingBox(), await widgets.nth(1).boundingBox()];
      expect(Math.abs(a!.x - b!.x)).toBeLessThan(2);
      expect(b!.y).toBeGreaterThan(a!.y);
    });

    test('Home: the default dashboard’s switcher has no Set as default', async ({ page }) => {
      await board('Ds home', true, ['net_worth']);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });
      await page.getByTestId('home-switch').click();
      await expect(switcherActions(page)).toHaveText(['Add widget', 'Edit dashboard', 'Add dashboard', 'View all dashboards']);
    });

    test('Home: Bills due rows show the due date; Nothing pending is a caption-sized link', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const bill = await seedCardBill(api, { name: 'Due Card', last4: '7403', dueInDays: 5 });
      const quiet = await createCreditCard(api, { name: 'Quiet Card', last4: '7404' });
      await board('Ds bills', true, ['bills_due']);
      await page.goto('/dashboard');
      const bills = page.getByTestId('bills-due-widget');
      const [, m, d] = istToday(5).split('-').map(Number);
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
      await expect(bills.locator(`[data-account-id="${bill.cardId}"]`)).toContainText(`Due ${d} ${month}`, { timeout: 45_000 });

      const toggle = bills.getByTestId('bills-nothing-pending').getByRole('button', { name: 'Nothing pending · 1 card' });
      const fontSize = (l: typeof toggle) => l.evaluate((el) => getComputedStyle(el).fontSize);
      expect(await fontSize(toggle)).toBe(await fontSize(bills.getByTestId('bills-widget-totals')));
      await toggle.click();
      await expect(bills.locator(`[data-account-id="${quiet.id}"]`)).not.toContainText('Due');
    });

    test('Home: the switcher offers Set as default on a dashboard that is not the default, and it becomes the default', async ({ page }) => {
      await board('Ds home', true, ['net_worth']);
      const money = await board('Ds money', false, ['net_worth']);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await page.getByRole('option', { name: 'Ds money' }).click();
      await page.getByTestId('home-switch').click();
      await expect(switcherActions(page)).toHaveText(['Add widget', 'Set as default', 'Edit dashboard', 'Add dashboard', 'View all dashboards']);
      await page.getByRole('button', { name: 'Set as default', exact: true }).click();
      await expect(page.getByText('Default dashboard set', { exact: true })).toBeVisible();
      await expect
        .poll(async () => ((await makeApi(currentUser.cookie).GET('/api/v1/dashboards/{id}', { params: { path: { id: money.id } } })).data ?? { isDefault: false }).isDefault)
        .toBe(true);
    });

    test('Home: the switcher lists the dashboards, shows the one picked, and ends with View all dashboards', async ({ page }) => {
      await board('Ds home', true, ['net_worth']);
      await board('Ds money', false, ['net_worth', 'upcoming', 'bills_due']);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await expect(page.getByRole('option')).toHaveCount(2);
      await expect(page.getByRole('option', { name: 'Ds home' })).toBeVisible();
      await page.getByRole('option', { name: 'Ds money' }).click();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(3, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await page.getByRole('link', { name: 'View all dashboards' }).click();
      await expect(page).toHaveURL(/\/dashboards$/);
    });

    test('Home: switcher Add widget saves straight to the dashboard, and Undo takes it off again', async ({ page }) => {
      test.slow();
      const home = await board('Home', true, ['net_worth']);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await page.getByRole('button', { name: 'Add widget', exact: true }).click();
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

    test('Home: switcher Edit dashboard opens that dashboard editing, and Add dashboard opens the create page', async ({ page }) => {
      const home = await board('Ds home', true);
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1, { timeout: 45_000 });

      await page.getByTestId('home-switch').click();
      await page.getByRole('link', { name: 'Edit dashboard', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboards/${home.id}`));
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds home', { timeout: 45_000 });

      await page.goto('/dashboard');
      await page.getByTestId('home-switch').click();
      await page.getByRole('link', { name: 'Add dashboard', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboards\/new/);
    });

    test('Home: an Attention row is one link; tapping it opens that item in the Inbox', async ({ page }) => {
      test.slow();
      const loan = await seedDueSoonLoan(makeApi(currentUser.cookie), 'Ds Attn Loan');
      await board('Ds home', true, ['attention']);
      await page.goto('/dashboard');
      const row = page.getByTestId('inbox-widget-row').first();
      await expect(row).toBeVisible({ timeout: 45_000 });
      await expect(row).toHaveAttribute('href', new RegExp(`/inbox\\?item=emi%3A${loan.id}`));
      await expect(page.getByTestId('inbox-widget').getByRole('button')).toHaveCount(0);
      await row.click();
      await expect(page).toHaveURL(/\/inbox\?item=emi/);
      await expect(page.locator(`[data-inbox-key="emi:${loan.id}:1"]`)).toBeVisible({ timeout: 45_000 });
    });

    test('Home: a default dashboard with nothing on it says so and offers Add widget', async ({ page }) => {
      await board('Ds home', true, []);
      await page.goto('/dashboard');
      await expect(page.getByText('No widgets yet')).toBeVisible({ timeout: 45_000 });
      await page.getByRole('button', { name: 'Add widget' }).click();
      await expect(page.getByRole('dialog', { name: /Add widget/ })).toBeVisible();
    });

    test('Home: with no default dashboard it says so, with four ways on, and Restore default Home brings it back', async ({ page }) => {
      await board('Ds money', false);
      await page.goto('/dashboard');
      await expect(page.getByText('No default dashboard')).toBeVisible({ timeout: 45_000 });
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: 'Add dashboard' })).toHaveAttribute('href', '/dashboards/new');
      await expect(main.getByRole('link', { name: 'View dashboards' })).toHaveAttribute('href', '/dashboards');
      await expect(main.getByRole('link', { name: 'Ask the data' })).toBeVisible();

      await main.getByRole('button', { name: 'Restore default Home' }).click();
      await expect(page.getByText('Home dashboard restored')).toBeVisible();
      // The restored Home brings its own widgets.
      await expect(page.getByTestId('dashboard-widget').first()).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('No default dashboard')).toHaveCount(0);
    });
  });
}
