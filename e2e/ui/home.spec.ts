import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill, seedDueSoonLoan } from '../fixtures/seed/obligations';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { createCategory, createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const HOME_WIDGETS = ['Net worth', 'Inbox', 'Bills due', 'Upcoming', 'Spend this month'];

function widgetCard(page: Page, title: string): Locator {
  return page.getByTestId('dashboard-widget').filter({
    has: page.getByRole('heading', { name: title, level: 3, exact: true }),
  });
}

test.describe('Home dashboard and built-in widgets (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-home');
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile seeded Home shows all five widgets with data, and a phone gets the single-column stack', async ({ page, isMobile }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Home Bank', openingBalance: 40000 });
    const food = await createCategory(api, 'Home Food');
    await createTransaction(api, bank.id, { amount: -500, description: 'Home spend sample', categoryIds: [food.id] });
    await seedDueSoonLoan(api, 'Home Loan');
    const bill = await seedCardBill(api, { name: 'Home Card', last4: '7401', dueInDays: 2 });

    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: /Switch dashboard, current: Home/ })).toBeVisible();
    for (const title of HOME_WIDGETS) {
      await expect(page.getByRole('heading', { name: title, level: 3, exact: true })).toBeVisible();
    }
    // Layout: a grid on desktop, one column of widgets on a phone.
    if (isMobile) {
      await expect(page.getByTestId('dashboard-stack')).toBeVisible();
    } else {
      await expect(page.getByTestId('dashboard-stack')).toHaveCount(0);
    }

    // Subtitles say what each built-in covers.
    await expect(widgetCard(page, 'Net worth')).toContainText('All accounts');
    await expect(widgetCard(page, 'Inbox')).toContainText('Most urgent first');
    await expect(widgetCard(page, 'Bills due')).toContainText('All cards');
    await expect(widgetCard(page, 'Upcoming')).toContainText('Next 14 days');

    // Every widget finishes loading without an error state.
    await expect(page.getByTestId('widget-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('inbox-widget-loading')).toHaveCount(0);
    await expect(page.getByTestId('bills-widget-loading')).toHaveCount(0);
    for (const title of HOME_WIDGETS) {
      await expect(widgetCard(page, title).getByRole('alert')).toHaveCount(0);
    }

    // Net worth: a figure. Spend this month: a chart of the debit above.
    await expect(widgetCard(page, 'Net worth')).toContainText(/\d/);
    await expect(widgetCard(page, 'Spend this month').locator('.recharts-wrapper')).toBeVisible();

    // Inbox widget: counts and the most urgent rows with their action.
    const inbox = widgetCard(page, 'Inbox').getByTestId('inbox-widget');
    await expect(inbox.getByTestId('inbox-widget-counts')).toContainText('Act now');
    await expect(inbox.getByTestId('inbox-widget-counts')).toContainText('Needs a look');
    await expect(inbox.getByText('Home Loan: EMI #1')).toBeVisible();
    await expect(inbox.getByRole('button', { name: 'Mark paid' })).toBeVisible();

    // Bills due widget: the card with its amount to pay.
    const bills = widgetCard(page, 'Bills due').getByTestId('bills-due-widget');
    await expect(bills.getByTestId('bills-widget-totals')).toContainText('To pay');
    const cardRow = bills.locator(`[data-account-id="${bill.cardId}"]`);
    await expect(cardRow).toHaveAttribute('data-phase', /arrived|overdue/);
    await expect(cardRow).toContainText('Home Card ••7401');

    // Upcoming widget: the next fourteen days from the obligations datasource.
    await expect(widgetCard(page, 'Upcoming')).toContainText('Home Loan');
  });

  test('widget chrome: Open on built-ins only, overflow menu, full-page view and duplicate as my report', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Chrome Bank', openingBalance: 1000 });
    await createTransaction(api, bank.id, { amount: -100 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Net worth', level: 3, exact: true })).toBeVisible();

    // "Open" drills through to a built-in's own page; Bills due and saved reports have none.
    await expect(page.getByRole('link', { name: 'Open Net worth' })).toHaveAttribute('href', '/accounts');
    await expect(page.getByRole('link', { name: 'Open Inbox' })).toHaveAttribute('href', '/inbox');
    await expect(page.getByRole('link', { name: 'Open Upcoming' })).toHaveAttribute('href', '/upcoming');
    await expect(page.getByRole('link', { name: 'Open Bills due' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Spend this month' })).toHaveCount(0);

    // A saved report's overflow menu edits the report; it cannot be duplicated from a widget.
    const spend = widgetCard(page, 'Spend this month');
    await spend.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit report' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Duplicate as my report' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'View full page' })).toBeVisible();
    await page.keyboard.press('Escape');
    // The closing menu stays mounted for its exit animation; wait until it is gone.
    await expect(page.getByRole('menu')).toHaveCount(0);

    // A template built-in can be viewed full page...
    const netWorth = widgetCard(page, 'Net worth');
    await netWorth.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'View full page' }).click();
    const full = page.getByRole('dialog');
    await expect(full.getByText('Net worth', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ...and copied into a saved report of its own.
    await netWorth.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate as my report' }).click();
    await expectToast(page, 'Saved "Net worth" to your reports');
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Net worth'))
      .toBe(true);

    // The Inbox's Open goes to the Inbox page.
    await page.getByRole('link', { name: 'Open Inbox' }).click();
    await page.waitForURL('**/inbox');
  });

  test('full-width dashboard switcher: fills the row, lists dashboards and switches between them', async ({ page, isMobile }) => {
    const api = makeApi(currentUser.cookie);
    // The first read of the dashboards seeds Home as the default, so seed it before adding a second.
    await api.GET('/api/v1/dashboards');
    const report = await createReport(api, {
      name: 'Switcher KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    await createDashboard(api, {
      name: 'Second board',
      isDefault: false,
      widgets: [widget(report.id, { x: 0, y: 0, w: 100, h: 4 }, null)],
    });

    await page.goto('/dashboard');
    const trigger = page.getByRole('button', { name: /Switch dashboard, current: Home/ });
    await expect(trigger).toBeVisible();

    const t = (await trigger.boundingBox())!;
    const wrapper = (await trigger.locator('xpath=..').boundingBox())!;
    const row = (await trigger.locator('xpath=../..').boundingBox())!;
    expect(Math.abs(t.width - wrapper.width)).toBeLessThan(2);
    const chat = page.getByRole('link', { name: 'Chat with your data' });
    if (isMobile) {
      // Phones and tablets keep the Chat button; the switcher takes everything else.
      await expect(chat).toBeVisible();
      const c = (await chat.boundingBox())!;
      const gap = c.x - (t.x + t.width);
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThan(16);
      expect(c.x + c.width).toBeGreaterThan(row.x + row.width - 20);
    } else {
      // Desktop has Chat in the sidebar header, so the switcher spans the whole row.
      await expect(chat).toHaveCount(0);
      expect(t.width).toBeGreaterThan(row.width - 40);
    }

    // The menu is as wide as the trigger and lists every dashboard.
    await trigger.click();
    await expect(page.getByText('Switch Dashboard')).toBeVisible();
    const menu = page.getByRole('menu');
    // The menu zooms in from 95% when it opens; measure once it has settled.
    await expect.poll(async () => Math.abs((await menu.boundingBox())!.width - t.width)).toBeLessThan(6);
    await expect(menu.getByRole('menuitem', { name: 'Home' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Second board' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'View All Dashboards' })).toHaveAttribute('href', '/dashboards');

    await menu.getByRole('menuitem', { name: 'Second board' }).click();
    await expect(page.getByRole('button', { name: /Switch dashboard, current: Second board/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Switcher KPI', level: 3 })).toBeVisible();
  });

  test('Bills due widget: partial payment, undo, paid in full and the Nothing pending group', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Pay Card', last4: '7402', dueInDays: 5 });

    await page.goto('/dashboard');
    const bills = widgetCard(page, 'Bills due').getByTestId('bills-due-widget');
    const cardRow = bills.locator(`[data-account-id="${bill.cardId}"]`);
    await expect(cardRow).toHaveAttribute('data-phase', 'arrived');
    await expect(cardRow.getByTestId('bill-headline')).toContainText('6,000');

    // Partial payment: the row shows the progress and offers Undo.
    await cardRow.getByRole('button', { name: 'Mark paid' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: 'Paid in full' }).click();
    await dialog.locator('#mark-paid-amount').fill('1000');
    await dialog.getByRole('button', { name: 'Mark as paid' }).click();
    await expectToast(page, 'Partial payment recorded');
    await expect(cardRow.getByTestId('bill-partial')).toContainText('1,000');
    await cardRow.getByRole('button', { name: 'Undo' }).click();
    await expectToast(page, 'Payment mark removed');
    await expect(cardRow.getByTestId('bill-partial')).toHaveCount(0);

    // Paid in full: the card settles into the collapsed "Nothing pending" group.
    await cardRow.getByRole('button', { name: 'Mark paid' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark as paid' }).click();
    await expectToast(page, 'Bill marked as paid');
    const group = bills.getByTestId('bills-nothing-pending');
    await expect(group).toContainText('Nothing pending · 1 card');
    await group.getByRole('button', { name: /Nothing pending/ }).click();
    const settled = group.locator(`[data-account-id="${bill.cardId}"]`);
    await expect(settled).toHaveAttribute('data-phase', 'nothing-pending');
    await expect(settled).toContainText('Paid on');
    await settled.getByRole('button', { name: 'Undo paid' }).click();
    await expectToast(page, 'Payment mark removed');
    await expect(bills.locator(`[data-account-id="${bill.cardId}"]`)).toHaveAttribute('data-phase', 'arrived');
  });

  test('Bills due widget with no credit cards says so and links to accounts', async ({ page }) => {
    await page.goto('/dashboard');
    const bills = widgetCard(page, 'Bills due');
    await expect(bills.getByText('No credit cards yet')).toBeVisible();
    await expect(bills.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts');
  });

  test('restore default Home: re-creates Home and reuses the Spend this month report', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const deleteAll = async () => {
      for (const d of (await api.GET('/api/v1/dashboards')).data ?? []) {
        await api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id: d.id } } });
      }
    };
    const spendReports = async () =>
      ((await api.GET('/api/v1/reports')).data ?? []).filter((r) => r.name === 'Spend this month').length;

    // The first read seeds Home (and its report); remove every dashboard to reach the empty state.
    await deleteAll();
    expect(await spendReports()).toBe(1);

    await page.goto('/dashboard');
    await expect(page.getByText("You don't have a default dashboard yet")).toBeVisible();
    await page.getByRole('button', { name: 'Restore default Home' }).click();
    await expectToast(page, 'Home dashboard restored');
    await expect(page.getByRole('button', { name: /Switch dashboard, current: Home/ })).toBeVisible();
    for (const title of HOME_WIDGETS) {
      await expect(page.getByRole('heading', { name: title, level: 3, exact: true })).toBeVisible();
    }
    expect(await spendReports(), 'restore reuses the report instead of piling up copies').toBe(1);

    // On the list, Restore is offered only while Home is missing.
    await page.goto('/dashboards');
    await expect(page.getByRole('button', { name: 'Restore default Home' })).toHaveCount(0);
    await deleteAll();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible();
    await page.getByRole('button', { name: 'Restore default Home' }).click();
    await expectToast(page, 'Home dashboard restored');
    await expect(page.locator('main').getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    expect(await spendReports()).toBe(1);
  });

  test('editor: add built-ins with params, bounds, minimum widths, remove, save', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const card = await seedCardBill(api, { name: 'Editor Card', last4: '7403', dueInDays: 6 });

    await page.goto('/dashboards/new');
    await page.getByPlaceholder('Dashboard name').fill('Built-in board');

    const addDialog = () => page.getByRole('dialog');
    const openPicker = async () => {
      await page.getByRole('button', { name: 'Add widget', exact: true }).click();
      await expect(addDialog().getByRole('heading', { name: 'Add a widget' })).toBeVisible();
    };

    // Built-ins without params are added at once, and can be added again.
    await openPicker();
    await expect(addDialog().getByText('Built-in').first()).toBeVisible();
    await addDialog().getByRole('button', { name: /^Net worth/ }).click();
    await openPicker();
    await addDialog().getByRole('button', { name: /^Inbox/ }).click();

    // Upcoming takes a number of days, bounded 1 to 90 and prefilled with 14.
    await openPicker();
    await addDialog().getByRole('button', { name: /^Upcoming/ }).click();
    const days = addDialog().getByLabel('Days ahead');
    await expect(days).toHaveValue('14');
    await expect(addDialog().getByText('Between 1 and 90.')).toBeVisible();
    const confirm = addDialog().getByRole('button', { name: 'Add widget' });
    await days.fill('100');
    await expect(addDialog().getByText('At most 90')).toBeVisible();
    await expect(confirm).toBeDisabled();
    await days.fill('0');
    await expect(addDialog().getByText('At least 1')).toBeVisible();
    await days.fill('1.5');
    await expect(addDialog().getByText('Enter a whole number')).toBeVisible();
    // Back returns to the list without adding anything.
    await addDialog().getByRole('button', { name: 'Back' }).click();
    await expect(addDialog().getByRole('heading', { name: 'Add a widget' })).toBeVisible();
    await addDialog().getByRole('button', { name: /^Upcoming/ }).click();
    await addDialog().getByLabel('Days ahead').fill('30');
    await addDialog().getByRole('button', { name: 'Add widget' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Bills due can be pinned to one card ("All cards" otherwise).
    await openPicker();
    await addDialog().getByRole('button', { name: /^Bills due/ }).click();
    await addDialog().getByLabel('Card').click();
    await expect(page.getByRole('option', { name: 'All cards' })).toBeVisible();
    await page.getByRole('option', { name: 'Editor Card' }).click();
    await addDialog().getByRole('button', { name: 'Add widget' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Four widgets in edit chrome: each has a title override. Full-width built-ins cannot be halved.
    await expect(page.getByLabel('Widget title')).toHaveCount(4);
    await expect(page.getByLabel('Widget title').first()).toHaveAttribute('placeholder', 'Net worth');
    await expect(page.getByTitle('This widget needs the full width')).toHaveCount(2);
    await expect(page.getByTitle('This widget needs the full width').first()).toBeDisabled();

    // Remove the Inbox widget.
    const inboxCard = page.getByTestId('dashboard-widget').filter({
      has: page.getByPlaceholder('Inbox', { exact: true }),
    });
    await inboxCard.getByRole('button', { name: 'Remove widget' }).click();
    await expect(page.getByLabel('Widget title')).toHaveCount(3);

    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/dashboards\/[a-f0-9-]+$/);

    // The saved dashboard shows each built-in with its params in the subtitle.
    await expect(page.getByRole('heading', { name: 'Built-in board', level: 1 })).toBeVisible();
    await expect(widgetCard(page, 'Net worth')).toBeVisible();
    await expect(widgetCard(page, 'Inbox')).toHaveCount(0);
    await expect(widgetCard(page, 'Upcoming')).toContainText('Next 30 days');
    await expect(widgetCard(page, 'Bills due')).toContainText('Editor Card');

    const saved = (await api.GET('/api/v1/dashboards')).data!.find((d) => d.name === 'Built-in board')!;
    const upcoming = saved.widgets.find((w) => w.builtinKey === 'upcoming')!;
    expect(upcoming.kind).toBe('builtin');
    expect(upcoming.params).toEqual({ days: 30 });
    const billsWidget = saved.widgets.find((w) => w.builtinKey === 'bills_due')!;
    expect(billsWidget.params).toEqual({ accountId: card.cardId });
    expect(saved.widgets.some((w) => w.builtinKey === 'attention')).toBe(false);
  });
});
