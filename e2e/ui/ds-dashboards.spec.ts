import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { createCategory, createTransaction } from '../fixtures/seed/transactions';
import { builtinWidget } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

type Point = { x: number; y: number };

const centerOf = async (locator: Locator): Promise<Point> => {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Presses `from`, moves to `to` in steps and releases (the grid listens to pointer events, mouse included). */
async function drag(page: Page, from: Point, to: Point) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

/** The grid's items in order, with their width step. */
const gridState = (page: Page) =>
  page
    .locator('[data-widget-grid-item]')
    .evaluateAll((els) => els.map((el) => `${el.getAttribute('data-widget-grid-item')}:${el.getAttribute('data-width')}`));

const itemIds = (page: Page) =>
  page.locator('[data-widget-grid-item]').evaluateAll((els) => els.map((el) => el.getAttribute('data-widget-grid-item')));

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Dashboards, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-dashboards');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    async function seedKpiReport(name = 'Ds Dash KPI') {
      return createReport(makeApi(currentUser.cookie), {
        name,
        type: 'KPI',
        datasource: 'transactions',
        definition: { measure: 'amount', aggregation: 'sum', filters: [] },
      });
    }

    /** A dashboard of two half-width widgets: a saved report ("wr") and Net worth ("wb"). */
    async function seedBoard(name = 'Ds board') {
      const api = makeApi(currentUser.cookie);
      const report = await seedKpiReport();
      const dashboard = await createDashboard(api, {
        name,
        isDefault: false,
        widgets: [widget(report.id, { x: 0, y: 0, w: 50, h: 24 }, null, 'wr'), builtinWidget('wb', 'net_worth', 50, undefined, { x: 50, y: 0, h: 24 })],
      });
      return { dashboard, report };
    }

    const widgetCard = (page: Page, id: string) => page.locator(`[data-testid="dashboard-widget"][data-widget-id="${id}"]`);

    test('view: the widgets show in the saved order, with the count and the page actions', async ({ page }) => {
      const { dashboard } = await seedBoard();
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
      expect(await itemIds(page)).toEqual(['wr', 'wb']);
      await expect(page.getByText('2 widgets', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Set as default', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      // Not editing: no bottom bar and no grips.
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
      await expect(page.locator('[data-widget-grid-grip]')).toHaveCount(0);
    });

    test('edit: reordering by the grip and saving keeps the new order after a reload', async ({ page }) => {
      const { dashboard } = await seedBoard();
      await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds board', { timeout: 45_000 });
      await expect(page.getByText('Unsaved changes')).toHaveCount(0);
      // The flag is taken off the address once the page is open.
      await expect(page).not.toHaveURL(/edit=1/);

      const grip = page.locator('[data-widget-grid-grip="wb"]');
      const first = page.locator('[data-widget-grid-item="wr"]');
      const target = (await first.boundingBox())!;
      await drag(page, await centerOf(grip), { x: target.x + 20, y: target.y + 20 });
      await expect.poll(() => itemIds(page)).toEqual(['wb', 'wr']);
      await expect(page.getByText('Unsaved changes')).toBeVisible();

      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('Dashboard saved')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      expect(await itemIds(page)).toEqual(['wb', 'wr']);

      await page.reload();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
      expect(await itemIds(page)).toEqual(['wb', 'wr']);
    });

    test('create: a name is required, widgets are added from the picker and the new dashboard opens', async ({ page }) => {
      test.slow();
      await seedKpiReport();
      await page.goto('/ds/dashboards/new');
      await expect(page.getByLabel('Dashboard name')).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText('Nothing on this dashboard yet')).toBeVisible();

      // No name: the field says so, a toast says why, nothing is created.
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page.getByText('Name the dashboard.')).toBeVisible();
      await expect(page.getByText("Couldn't save the dashboard. Fix the fields marked in red.")).toBeVisible();
      await expect(page.getByLabel('Dashboard name')).toBeFocused();
      await expect(page).toHaveURL(/\/ds\/dashboards\/new/);

      await page.getByLabel('Dashboard name').fill('Ds created board');

      // A built-in from the picker, then a saved report (the top bar's + opens it).
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Add widget' }).click();
      let picker = page.getByRole('dialog', { name: /Add widget/ });
      await expect(picker.getByRole('tab', { name: /Built-in/ })).toBeVisible();
      await picker.getByRole('radio', { name: /Net worth/ }).click();
      await expect(picker.getByText(/^Selected/).first()).toBeVisible();
      await picker.getByRole('button', { name: 'Add to board' }).click();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(1);

      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Add widget' }).click();
      picker = page.getByRole('dialog', { name: /Add widget/ });
      await picker.getByRole('tab', { name: /My reports/ }).click();
      await picker.getByRole('radio', { name: /Ds Dash KPI/ }).click();
      await picker.getByPlaceholder('Ds Dash KPI').fill('My spend');
      await picker.getByRole('button', { name: 'Add to board' }).click();
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2);
      await expect(page.getByText('My spend', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Unsaved changes')).toBeVisible();

      const before = await gridState(page);
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page.getByText('Dashboard created')).toBeVisible();
      await expect(page).toHaveURL(/\/ds\/dashboards\/(?!new)[0-9a-f-]+$/, { timeout: 30_000 });
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });
      expect((await gridState(page)).map((s) => s.split(':')[1])).toEqual(before.map((s) => s.split(':')[1]));
      await expect(page.getByText('2 widgets', { exact: true })).toBeVisible();
    });

    test('Add header puts a titled section header on top, edited inline, and Save keeps it', async ({ page }) => {
      await page.goto('/ds/dashboards/new');
      await page.getByLabel('Dashboard name').fill('Ds headed board');
      // The top bar's + opens Add widget and Add header; Add header is the second row.
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByRole('menuitem')).toHaveText(['Add widget', 'Add header']);
      await page.getByRole('menuitem', { name: 'Add header' }).click();
      // The new header's title field is right on the header and focused.
      const title = page.getByLabel('Header', { exact: true });
      await expect(title).toBeFocused();
      await title.fill('This month');
      await page.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards\/(?!new)[0-9a-f-]+$/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'This month' })).toBeVisible({ timeout: 45_000 });
      // A header is full width and not a widget.
      await expect(page.locator('[data-widget-grid-item][data-width="full"]')).toHaveCount(1);
      await expect(page.getByText('0 widgets', { exact: true })).toBeVisible();
      // Plain heading text, not a grey band.
      await expect(page.getByTestId('dashboard-header')).toBeVisible();
    });

    test('edit: no Add header button by the name; the confirm to discard is not red', async ({ page }) => {
      const { dashboard } = await seedBoard('Ds plain discard');
      await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds plain discard', { timeout: 45_000 });
      await expect(page.getByRole('button', { name: 'Add header' })).toHaveCount(0);
      await page.getByLabel('Dashboard name').fill('Ds changed');
      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      const confirm = page.getByRole('dialog', { name: 'Discard changes?' }).getByRole('button', { name: 'Discard', exact: true });
      await expect(confirm).toBeVisible();
      expect(await confirm.getAttribute('class')).not.toMatch(/danger/);
    });

    test('widget menus: a report widget and a built-in offer their own items', async ({ page }) => {
      const { dashboard, report } = await seedBoard();
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      await expect(page.getByTestId('dashboard-widget')).toHaveCount(2, { timeout: 45_000 });

      await widgetCard(page, 'wr').getByRole('button', { name: 'Widget options' }).click();
      await expect(page.getByRole('menuitem')).toHaveText(['Edit report', 'View full page', 'View underlying data']);
      await page.getByRole('menuitem', { name: 'View full page' }).click();
      const full = page.getByRole('dialog');
      await expect(full).toBeVisible();
      await expect(full.getByText('Ds Dash KPI')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await widgetCard(page, 'wr').getByRole('button', { name: 'Widget options' }).click();
      await page.getByRole('menuitem', { name: 'View underlying data' }).click();
      await expect(page.getByRole('dialog').getByText(/Underlying data/).first()).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await widgetCard(page, 'wb').getByRole('button', { name: 'Widget options' }).click();
      await expect(page.getByRole('menuitem', { name: 'Widget settings' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Duplicate as my report' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Edit report' })).toHaveCount(0);
      // Net worth is a KPI built-in, so it lists its underlying data too (owner 2026-10-26).
      await expect(page.getByRole('menuitem', { name: 'View underlying data' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Duplicate as my report' }).click();
      await expect(page.getByText(/Saved "Net worth" to your reports/)).toBeVisible({ timeout: 30_000 });

      await widgetCard(page, 'wr').getByRole('button', { name: 'Widget options' }).click();
      await page.getByRole('menuitem', { name: 'Edit report' }).click();
      await expect(page).toHaveURL(new RegExp(`/ds/reports/${report.id}`));
    });

    test('Set as default makes it the default, and the button then clears it', async ({ page }) => {
      const { dashboard } = await seedBoard();
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      await page.getByRole('button', { name: 'Set as default', exact: true }).click();
      await expect(page.getByText('Set as default', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear default', exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Clear default', exact: true })).toBeVisible({ timeout: 45_000 });
    });

    test('unsaved changes are guarded: Discard asks, Keep editing stays, Discard restores the saved dashboard', async ({ page }) => {
      const { dashboard } = await seedBoard('Ds guarded');
      await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
      const name = page.getByLabel('Dashboard name');
      await expect(name).toHaveValue('Ds guarded', { timeout: 45_000 });

      // Nothing changed: Discard just leaves editing.
      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Edit', exact: true }).click();

      await name.fill('Ds renamed');
      await expect(page.getByText('Unsaved changes')).toBeVisible();
      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      const confirm = page.getByRole('dialog', { name: 'Discard changes?' });
      await expect(confirm.getByText('Your edits to Ds guarded will be lost.')).toBeVisible();
      await confirm.getByRole('button', { name: 'Keep editing' }).click();
      await expect(name).toHaveValue('Ds renamed');

      // Leaving by a link asks too.
      await page.getByRole('link', { name: 'Ask the data' }).first().click({ force: true });
      await expect(page.getByRole('dialog', { name: 'Discard changes?' })).toBeVisible();
      await page.getByRole('dialog', { name: 'Discard changes?' }).getByRole('button', { name: 'Keep editing' }).click();

      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      await page.getByRole('dialog', { name: 'Discard changes?' }).getByRole('button', { name: 'Discard', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds guarded');
    });

    test('browser Back with unsaved changes asks first: Keep editing stays with the edits, Discard goes back', async ({ page }) => {
      const { dashboard } = await seedBoard('Ds back guarded');
      // Arrive by an in-app navigation, so Back stays in the app.
      await page.goto('/ds/dashboards');
      await page.getByRole('main').getByText('Ds back guarded', { exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`/ds/dashboards/${dashboard.id}$`));
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      const name = page.getByLabel('Dashboard name');
      await name.fill('Ds back renamed');
      await expect(page.getByText('Unsaved changes')).toBeVisible();

      // page.goBack would wait for a navigation that the guard cancels.
      await page.evaluate(() => window.history.back());
      const confirm = page.getByRole('dialog', { name: 'Discard changes?' });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Keep editing' }).click();
      await expect(page).toHaveURL(new RegExp(`/ds/dashboards/${dashboard.id}$`));
      await expect(name).toHaveValue('Ds back renamed');

      await page.evaluate(() => window.history.back());
      await page.getByRole('dialog', { name: 'Discard changes?' }).getByRole('button', { name: 'Discard', exact: true }).click();
      await expect(page).toHaveURL(/\/ds\/dashboards$/);
    });

    test('remove a widget and rename, then Save writes it', async ({ page }) => {
      const { dashboard } = await seedBoard('Ds trimmed');
      await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
      await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds trimmed', { timeout: 45_000 });
      await page.getByRole('button', { name: /Remove widget/ }).first().click();
      await expect(page.locator('[data-widget-grid-item]')).toHaveCount(1);
      await page.getByLabel('Dashboard name').fill('Ds trimmed down');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('Dashboard saved')).toBeVisible();
      await page.reload();
      await expect(page.getByText('1 widget', { exact: true })).toBeVisible({ timeout: 45_000 });
    });

    /** Two categories with one transaction each, and a dashboard of one saved report ("wr") over them. */
    async function seedSplitBoard(type: 'bar' | 'table') {
      const api = makeApi(currentUser.cookie);
      const account = await createBankAccount(api, { name: `Split Bank ${Date.now()}` });
      const tag = Date.now();
      const food = await createCategory(api, `Split Food ${tag}`);
      const fuel = await createCategory(api, `Split Fuel ${tag}`);
      await createTransaction(api, account.id, { amount: -300, description: `Split food row ${tag}`, categoryIds: [food.id] });
      await createTransaction(api, account.id, { amount: -100, description: `Split fuel row ${tag}`, categoryIds: [fuel.id] });
      const filters = [{ field: 'date', operator: 'this_month' }];
      const measure = { field: 'spend', aggregation: 'sum' };
      const name = `Ds split ${type} ${tag}`;
      const report = await createReport(
        api,
        (type === 'bar'
          ? { name, type: 'CHART', datasource: 'transactions', definition: { chartType: 'bar', dimension: { field: 'category' }, measure, filters } }
          : { name, type: 'TABLE', datasource: 'transactions', definition: { mode: 'aggregated', rows: [{ field: 'category' }], columns: [], measures: [measure], filters } }) as never,
      );
      const dashboard = await createDashboard(api, { name: `Ds split board ${tag}`, isDefault: false, widgets: [widget(report.id, { x: 0, y: 0, w: 100, h: 24 }, null, 'wr')] });
      return { dashboard, name, categories: [`Split Food ${tag}`, `Split Fuel ${tag}`], rows: { [`Split Food ${tag}`]: `Split food row ${tag}`, [`Split Fuel ${tag}`]: `Split fuel row ${tag}` } as Record<string, string> };
    }

    test('Net worth: tapping the value opens its underlying data', async ({ page }) => {
      test.slow();
      const { dashboard } = await seedBoard();
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      await widgetCard(page, 'wb').getByTestId('net-worth-value').getByRole('button').click({ timeout: 45_000 });
      const dialog = page.getByRole('dialog', { name: 'Underlying data · Net worth' });
      await expect(dialog).toBeVisible({ timeout: 45_000 });
      await expect(dialog.getByText(/make(s)? up this figure|No (rows|transactions)/i).first()).toBeVisible({ timeout: 45_000 });
    });

    test('chart widget: tapping a bar opens "Underlying data · <widget>" filtered to that bar', async ({ page }) => {
      test.slow();
      const { dashboard, name, categories, rows } = await seedSplitBoard('bar');
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      const bars = widgetCard(page, 'wr').locator('.recharts-bar-rectangle');
      await expect(bars).toHaveCount(2, { timeout: 45_000 });
      await bars.first().click();
      const dialog = page.getByRole('dialog', { name: `Underlying data · ${name}` });
      const chip = dialog.getByRole('button', { name: /^Category: / });
      await expect(chip).toBeVisible({ timeout: 45_000 });
      const tapped = ((await chip.getAttribute('aria-label')) ?? (await chip.innerText())).replace(/^Category: /, '').trim();
      expect(categories).toContain(tapped);
      const other = categories.find((c) => c !== tapped)!;
      await expect(dialog.getByText('1 transaction makes up this figure')).toBeVisible({ timeout: 45_000 });
      await expect(dialog.getByText(rows[tapped]).first()).toBeVisible();
      await expect(dialog.getByText(rows[other])).toHaveCount(0);
    });

    test('pivot table widget: tapping a row opens the rows of that row only', async ({ page }) => {
      test.slow();
      const { dashboard, name, categories, rows } = await seedSplitBoard('table');
      await page.goto(`/ds/dashboards/${dashboard.id}`);
      const card = widgetCard(page, 'wr');
      await expect(card.getByText(categories[0], { exact: true }).first()).toBeVisible({ timeout: 45_000 });
      await card.getByText(categories[0], { exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name: `Underlying data · ${name}` });
      await expect(dialog.getByText('1 transaction makes up this figure')).toBeVisible({ timeout: 45_000 });
      await expect(dialog.getByText(rows[categories[0]]).first()).toBeVisible();
      await expect(dialog.getByText(rows[categories[1]])).toHaveCount(0);
    });

    test('edit: tapping a bar opens nothing', async ({ page }) => {
      test.slow();
      const { dashboard } = await seedSplitBoard('bar');
      await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
      await expect(page.getByLabel('Dashboard name')).toBeVisible({ timeout: 45_000 });
      const bars = widgetCard(page, 'wr').locator('.recharts-bar-rectangle');
      await expect(bars).toHaveCount(2, { timeout: 45_000 });
      // Edit mode makes widget content inert, so a tap on the bar reaches nothing.
      await expect.poll(() => bars.first().evaluate((el) => !!el.closest('[inert]')), { timeout: 15_000 }).toBe(true);
      // The chart redraws as the edit grid settles, so measure once the bar stays put.
      let at: Point = { x: 0, y: 0 };
      await expect(async () => {
        at = await centerOf(bars.first());
      }).toPass({ timeout: 15_000 });
      await page.mouse.click(at.x, at.y);
      await page.waitForTimeout(500);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    if (!phone) {
      test('resizing by the corner snaps to a width step and Save keeps it', async ({ page }) => {
        const { dashboard } = await seedBoard();
        await page.goto(`/ds/dashboards/${dashboard.id}?edit=1`);
        await expect(page.getByLabel('Dashboard name')).toHaveValue('Ds board', { timeout: 45_000 });
        const grid = page.locator('[data-editing="true"]');
        await expect(grid).toBeVisible();
        await expect(page.locator('[data-widget-grid-item="wr"]')).toBeVisible();
        const gridBox = (await grid.boundingBox())!;
        const item = page.locator('[data-widget-grid-item="wr"]');
        const itemBox = (await item.boundingBox())!;
        const handle = page.locator('[data-widget-grid-resize="wr"]');
        const at = await centerOf(handle);
        // Drag the corner until the widget is a quarter of the grid wide.
        await drag(page, at, { x: at.x + (gridBox.width * 0.25 - itemBox.width), y: at.y });
        await expect(item).toHaveAttribute('data-width', 'quarter');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText('Dashboard saved')).toBeVisible();
        await page.reload();
        await expect(page.locator('[data-widget-grid-item="wr"]')).toHaveAttribute('data-width', 'quarter', { timeout: 45_000 });
      });
    }
  });
}
