import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill, seedDueSoonLoan } from '../fixtures/seed/obligations';
import { createCategory, createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const HOME_WIDGETS = ['Net worth', 'Inbox', 'Bills due', 'Upcoming', 'Spend this month'];

function widgetCard(page: Page, title: string): Locator {
  return page.getByTestId('dashboard-widget').filter({ hasText: new RegExp(`^${title}`) });
}

async function openMenu(page: Page, widget: Locator): Promise<void> {
  await widget.getByRole('button', { name: 'Widget options' }).click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
}

test.describe('Home dashboard and built-in widgets (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-home');
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile seeded Home shows all five widgets with data', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Home Bank', openingBalance: 40000 });
    const food = await createCategory(api, 'Home Food');
    await createTransaction(api, bank.id, { amount: -500, description: 'Home spend sample', tagIds: [food.id] });
    await seedDueSoonLoan(api, 'Home Loan');
    const bill = await seedCardBill(api, { name: 'Home Card', last4: '7401', dueInDays: 2 });

    await page.goto('/home');
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(HOME_WIDGETS.length, { timeout: 45_000 });
    for (const title of HOME_WIDGETS) {
      await expect(widgetCard(page, title)).toBeVisible();
    }

    // Subtitles say what each built-in covers.
    await expect(widgetCard(page, 'Net worth')).toContainText('All accounts');
    await expect(widgetCard(page, 'Inbox')).toContainText('Act now');
    await expect(widgetCard(page, 'Bills due')).toContainText('All cards');
    await expect(widgetCard(page, 'Upcoming')).toContainText('Next 14 days');

    // Every widget finishes loading without an error state.
    await expect(page.getByTestId('widget-skeleton')).toHaveCount(0);
    for (const title of HOME_WIDGETS) {
      await expect(widgetCard(page, title).getByRole('alert')).toHaveCount(0);
    }

    // Net worth: a figure. Spend this month: a chart of the debit above.
    await expect(widgetCard(page, 'Net worth')).toContainText(/\d/);
    await expect(widgetCard(page, 'Spend this month').getByRole('table', { name: 'Chart data' })).toBeVisible();

    // Inbox widget: counts and the most urgent rows, each one link into the Inbox.
    const inbox = widgetCard(page, 'Inbox').getByTestId('inbox-widget');
    await expect(widgetCard(page, 'Inbox')).toContainText(/Act now\s*2/);
    await expect(widgetCard(page, 'Inbox')).toContainText(/needs a look\s*0/);
    await expect(inbox.getByRole('link', { name: /Home Loan: EMI #1/ })).toBeVisible();

    // Bills due widget: the card with its amount to pay.
    const bills = widgetCard(page, 'Bills due').getByTestId('bills-due-widget');
    await expect(bills.getByTestId('bills-widget-totals')).toContainText('To pay');
    const cardRow = bills.locator(`[data-account-id="${bill.cardId}"]`);
    await expect(cardRow).toHaveAttribute('data-phase', /arrived|overdue/);
    await expect(cardRow).toContainText('Home Card ••7401');

    // Upcoming widget: the next fourteen days from the obligations datasource.
    await expect(widgetCard(page, 'Upcoming')).toContainText('Home Loan');
  });

  test('widget chrome: each widget’s ⋮ menu, full-page view and duplicate as my report', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Chrome Bank', openingBalance: 1000 });
    await createTransaction(api, bank.id, { amount: -100 });

    await page.goto('/home');
    await expect(widgetCard(page, 'Net worth')).toBeVisible({ timeout: 45_000 });

    // A saved report's menu edits the report or opens its rows; it cannot be duplicated from a widget.
    await openMenu(page, widgetCard(page, 'Spend this month'));
    await expect(page.getByRole('menuitem')).toHaveText(['Edit report', 'View underlying data']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Inbox and Bills due have settings only; there is no Open link on any widget.
    await openMenu(page, widgetCard(page, 'Inbox'));
    await expect(page.getByRole('menuitem')).toHaveText(['Widget settings']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await openMenu(page, widgetCard(page, 'Bills due'));
    await expect(page.getByRole('menuitem')).toHaveText(['Widget settings']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('link', { name: /^Open/ })).toHaveCount(0);

    // A template built-in is copied into a saved report of its own.
    await openMenu(page, widgetCard(page, 'Net worth'));
    await expect(page.getByRole('menuitem')).toHaveText(['Widget settings', 'Duplicate as my report', 'View full page', 'View underlying data']);
    await page.getByRole('menuitem', { name: 'Duplicate as my report' }).click();
    await expect(page.getByText(/Report "Net worth" saved/)).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Net worth'))
      .toBe(true);

    // "View full page" drills through to the built-in's own page.
    await openMenu(page, widgetCard(page, 'Net worth'));
    await page.getByRole('menuitem', { name: 'View full page' }).click();
    await page.waitForURL('**/accounts');
    await page.goBack();
    await openMenu(page, widgetCard(page, 'Upcoming'));
    await page.getByRole('menuitem', { name: 'View full page' }).click();
    await page.waitForURL('**/upcoming');
  });

  test('Bills due widget with no credit cards says so and links to accounts', async ({ page }) => {
    await page.goto('/home');
    const bills = widgetCard(page, 'Bills due');
    await expect(bills.getByText('Add a credit card to track its bills here.')).toBeVisible({ timeout: 45_000 });
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

    await page.goto('/home');
    await expect(page.getByText('No default dashboard')).toBeVisible({ timeout: 45_000 });
    await page.getByRole('main').getByRole('button', { name: 'Restore default Home' }).click();
    await expect(page.getByText('Home dashboard restored')).toBeVisible();
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(HOME_WIDGETS.length, { timeout: 45_000 });
    for (const title of HOME_WIDGETS) {
      await expect(widgetCard(page, title)).toBeVisible();
    }
    expect(await spendReports(), 'restore reuses the report instead of piling up copies').toBe(1);

    // On the list, Restore is offered only while Home is missing.
    await page.goto('/dashboards');
    await expect(page.getByRole('table').getByRole('button').filter({ hasText: /^Home/ })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Restore default Home' })).toHaveCount(0);
    await deleteAll();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restore default Home' })).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Restore default Home' }).click();
    await expect(page.getByText('Home dashboard restored')).toBeVisible();
    await expect(page.getByRole('table').getByRole('button').filter({ hasText: /^Home/ })).toBeVisible({ timeout: 45_000 });
    expect(await spendReports()).toBe(1);
  });

  test('editor: add built-ins with params, remove, save; the saved dashboard shows each param in its subtitle', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const card = await seedCardBill(api, { name: 'Editor Card', last4: '7403', dueInDays: 6 });

    await page.goto('/dashboards/new');
    await page.getByLabel('Dashboard name').fill('Built-in board');

    const picker = () => page.getByRole('dialog', { name: /Add widget/ });
    const openPicker = async () => {
      await page.getByRole('button', { name: /^Add widget$|^Add a widget$/ }).first().click();
      await expect(picker().getByRole('radio').first()).toBeVisible({ timeout: 45_000 });
    };
    const addToBoard = () => picker().getByRole('button', { name: 'Add to board' });

    // Built-ins without params are added as they stand, and can be added again.
    await openPicker();
    await picker().getByRole('radio', { name: /^Net worth/ }).click();
    await addToBoard().click();
    await expect(picker()).toHaveCount(0);
    await openPicker();
    await picker().getByRole('radio', { name: /^Inbox/ }).click();
    await addToBoard().click();
    await expect(picker()).toHaveCount(0);

    // Upcoming takes a number of days, bounded 1 to 90 and prefilled with 14.
    await openPicker();
    await picker().getByRole('radio', { name: /^Upcoming/ }).click();
    const days = picker().getByRole('spinbutton', { name: 'Days ahead' });
    await expect(days).toHaveValue('14');
    await expect(picker().getByText('Between 1 and 90.')).toBeVisible();
    await days.fill('100');
    await expect(addToBoard()).toBeDisabled();
    await days.fill('0');
    await expect(addToBoard()).toBeDisabled();
    await days.fill('1.5');
    await expect(addToBoard()).toBeDisabled();
    await days.fill('30');
    await expect(addToBoard()).toBeEnabled();
    await addToBoard().click();
    await expect(picker()).toHaveCount(0);

    // Bills due can be pinned to one card ("All cards" otherwise).
    await openPicker();
    await picker().getByRole('radio', { name: /^Bills due/ }).click();
    await picker().getByRole('combobox', { name: /^Card/ }).click();
    await expect(page.getByRole('option', { name: 'All cards' })).toBeVisible();
    await page.getByRole('option', { name: 'Editor Card' }).click();
    await addToBoard().click();
    await expect(picker()).toHaveCount(0);

    // Four widgets on the board; remove the Inbox widget.
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(4);
    await page.getByRole('button', { name: /Remove widget Inbox/ }).click();
    await expect(page.getByTestId('dashboard-widget')).toHaveCount(3);

    await page.getByRole('button', { name: 'Add dashboard', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/(?!new)[0-9a-f-]+$/, { timeout: 30_000 });

    // The saved dashboard shows each built-in with its params in the subtitle.
    await expect(widgetCard(page, 'Net worth')).toBeVisible({ timeout: 45_000 });
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
