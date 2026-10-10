import type { Locator, Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { addLending, createCounterparty } from '../fixtures/seed/loans';
import { seedCardBill } from '../fixtures/seed/obligations';
import { createDashboard, runSaved } from '../fixtures/seed/reports';
import { createMilestone, createRewardCard, spend } from '../fixtures/seed/rewards';
import { createTransaction, searchAll } from '../fixtures/seed/transactions';
import { ddmmyyyy } from '../fixtures/seed/underlying';
import { builtinWidget, istMonth, runBuiltin, SHORTCUTS_DEFAULT, ym } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function viewCard(page: Page, title: string): Locator {
  return page.getByTestId('dashboard-widget').filter({ has: page.getByRole('heading', { name: title, level: 3, exact: true }) });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** "Aug 2026" for the IST month `offset` months from now. */
function monthLabel(offset: number): string {
  const m = istMonth(offset);
  return `${MONTHS[m.month - 1]} ${m.year}`;
}

/** A dashboard of built-ins, opened in view mode at /dashboards/{id}. */
async function openBoard(page: Page, api: ApiClient, name: string, widgets: ReturnType<typeof builtinWidget>[]): Promise<string> {
  const dash = await createDashboard(api, { name, isDefault: false, widgets } as never);
  await page.goto(`/dashboards/${dash.id}`);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  return dash.id;
}

async function openMenu(page: Page, widget: Locator, item: string): Promise<void> {
  await widget.getByRole('button', { name: 'More actions' }).click();
  // Only the menu just opened: a previous one can still be animating out (data-state="closed").
  await page.locator('[role="menu"][data-state="open"]').getByRole('menuitem', { name: item }).click();
}

async function widgetParams(api: ApiClient, dashboardId: string, widgetId: string): Promise<unknown> {
  const res = await api.GET('/api/v1/dashboards/{id}', { params: { path: { id: dashboardId } } });
  expectStatus(res, 200);
  return res.data!.widgets.find((w) => w.id === widgetId)!.params;
}

test.describe('Built-in widgets on a dashboard (@ui)', () => {
  let currentUser: CreatedUser;
  let api: ApiClient;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-builtin-widgets');
    api = makeApi(currentUser.cookie);
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile Widget settings change a widget’s params, which persist after a reload', async ({ page }) => {
    test.slow();
    await createBankAccount(api, { name: 'Settings Bank', openingBalance: 1000 });
    const id = await openBoard(page, api, 'Settings board', [
      builtinWidget('heat', 'spend_heatmap', 100, { months: 6 }, { h: 16 }),
      builtinWidget('movers', 'top_movers', 50, { n: 5 }, { y: 16 }),
    ]);

    const heat = viewCard(page, 'Spending calendar');
    await expect(heat).toContainText('Last 6 months');
    await openMenu(page, heat, 'Widget settings');
    const settings = page.getByRole('dialog', { name: 'Widget settings' });
    const months = settings.getByLabel('Months');
    await expect(months).toHaveValue('6');
    await months.fill('13');
    await expect(settings.getByText('At most 12')).toBeVisible();
    await expect(settings.getByRole('button', { name: 'Save' })).toBeDisabled();
    await months.fill('3');
    await settings.getByRole('button', { name: 'Save' }).click();
    await expect(settings).toHaveCount(0);
    await expect(heat).toContainText('Last 3 months');

    const movers = viewCard(page, 'Top movers');
    await openMenu(page, movers, 'Widget settings');
    const howMany = page.getByRole('dialog', { name: 'Widget settings' }).getByLabel('How many');
    await expect(howMany).toHaveValue('5');
    await howMany.fill('8');
    await page.getByRole('dialog', { name: 'Widget settings' }).getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Cancel leaves the params alone.
    await openMenu(page, heat, 'Widget settings');
    await page.getByRole('dialog', { name: 'Widget settings' }).getByLabel('Months').fill('11');
    await page.getByRole('dialog', { name: 'Widget settings' }).getByRole('button', { name: 'Cancel' }).click();
    await expect(heat).toContainText('Last 3 months');

    await page.reload();
    await expect(viewCard(page, 'Spending calendar')).toContainText('Last 3 months');
    await openMenu(page, viewCard(page, 'Top movers'), 'Widget settings');
    await expect(page.getByRole('dialog', { name: 'Widget settings' }).getByLabel('How many')).toHaveValue('8');
    await page.keyboard.press('Escape');

    expect(await widgetParams(api, id, 'heat')).toEqual({ months: 3 });
    expect(await widgetParams(api, id, 'movers')).toEqual({ n: 8 });
  });

  test('@mobile shortcuts: configure, reorder, tiles navigate, and Add transaction lazily opens its dialog and creates one', async ({ page }) => {
    test.slow();
    test.setTimeout(150_000);
    const bank = await createBankAccount(api, { name: 'Shortcut Bank', openingBalance: 5000 });
    const id = await openBoard(page, api, 'Shortcuts board', [builtinWidget('sc', 'shortcuts', 50, { items: SHORTCUTS_DEFAULT })]);

    const widget = viewCard(page, 'Shortcuts');
    const tiles = widget.getByRole('list', { name: 'Shortcuts' }).getByRole('listitem');
    await expect(tiles).toHaveText(['Add transaction', 'Needs Review', 'Import', 'Upcoming']);

    // Configure: add Record lending and the bank account, move Record lending up, drop Import.
    await openMenu(page, widget, 'Widget settings');
    const settings = page.getByRole('dialog', { name: 'Widget settings' });
    const editor = settings.getByTestId('shortcuts-params-editor');
    await expect(editor).toContainText('4 of 12');
    const chosen = editor.getByRole('list', { name: 'Chosen shortcuts' }).getByRole('listitem');
    await expect(chosen).toHaveText(['Add transaction', 'Needs Review', 'Import', 'Upcoming']);
    const search = editor.getByLabel('Add or remove');
    await search.fill('Record');
    await editor.getByRole('checkbox', { name: 'Record lending', exact: true }).check();
    await search.fill('Shortcut Bank');
    await editor.getByRole('checkbox', { name: 'Shortcut Bank', exact: true }).check();
    await search.fill('');
    await editor.getByRole('checkbox', { name: 'Import', exact: true }).uncheck();
    await expect(chosen).toHaveText(['Add transaction', 'Needs Review', 'Upcoming', 'Record lending', 'Shortcut Bank']);
    await editor.getByRole('button', { name: 'Move Record lending up' }).click();
    await expect(chosen).toHaveText(['Add transaction', 'Needs Review', 'Record lending', 'Upcoming', 'Shortcut Bank']);
    await expect(editor).toContainText('5 of 12');
    await settings.getByRole('button', { name: 'Save' }).click();
    await expect(settings).toHaveCount(0);

    await expect(tiles).toHaveText(['Add transaction', 'Needs Review', 'Record lending', 'Upcoming', 'Shortcut Bank']);
    expect(await widgetParams(api, id, 'sc')).toEqual({
      items: ['action:add-transaction', 'page:/transactions/review', 'action:record-lending', 'page:/upcoming', `account:${bank.id}`],
    });

    // Links go where they say.
    await expect(widget.getByRole('link', { name: 'Shortcut Bank' })).toHaveAttribute('href', `/accounts/${bank.id}`);
    await widget.getByRole('link', { name: 'Upcoming' }).click();
    await page.waitForURL('**/upcoming');
    await page.goBack();
    await expect(viewCard(page, 'Shortcuts')).toBeVisible();

    // The action's dialog is not on the page until the tile is used.
    await expect(page.locator('#amount-input')).toHaveCount(0);
    await viewCard(page, 'Shortcuts').getByRole('button', { name: 'Add transaction' }).click();
    const amount = page.locator('#amount-input');
    await expect(amount).toBeVisible();
    await amount.fill('321.50');
    const accountTrigger = page.getByRole('combobox').filter({ hasText: /Select Account/i });
    if (await accountTrigger.isVisible()) {
      await accountTrigger.click();
      await page.getByRole('option', { name: 'Shortcut Bank' }).click();
    }
    await page.getByPlaceholder('Add description or notes...').fill('Shortcut lunch');
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#amount-input')).toHaveCount(0);
    await expect.poll(async () => (await searchAll(api, undefined, 'Shortcut lunch')).length).toBe(1);
    const [txn] = await searchAll(api, undefined, 'Shortcut lunch');
    expect(txn.accountId).toBe(bank.id);
    expect(Math.abs(Number(txn.amount))).toBe(321.5);
  });

  test('lending balances: Settle up opens Record lending prefilled for that person and amount; saving squares them', async ({ page }) => {
    test.slow();
    const friend = await createCounterparty(api, { name: 'Settle Friend' });
    await addLending(api, { counterpartyId: friend.id, direction: 'lent', amount: 2500, entryDate: istToday(-6) });
    await addLending(api, { newCounterpartyName: 'Settle Lender', direction: 'borrowed', amount: 9000, entryDate: istToday(-6) });
    await openBoard(page, api, 'Lending board', [builtinWidget('lb', 'lending_balances', 50)]);

    const widget = viewCard(page, 'Lending balances');
    const rows = widget.getByRole('list', { name: 'Balances' }).getByRole('listitem');
    // Biggest first: what you owe the lender, then what the friend owes you.
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Settle Lender');
    await expect(rows.nth(0)).toContainText('You owe');
    await expect(rows.nth(1)).toContainText('Settle Friend');
    await expect(rows.nth(1)).toContainText('Owes you');

    await widget.getByRole('button', { name: 'Settle up with Settle Friend' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Add Ledger Entry/ })).toBeVisible();
    await expect(dialog).toContainText('Settle Friend');
    await expect(dialog.getByLabel('They paid me back')).toBeChecked();
    await expect(dialog.locator('#amount')).toHaveValue('2500');
    await dialog.getByRole('button', { name: 'Save Entry' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Settle Lender');
    const outstanding = await api.GET('/api/v1/counterparties', { params: { query: { outstanding: true, sort: ['net'] } } });
    expect(outstanding.data!.content.map((c) => c.name)).toEqual(['Settle Lender']);
  });

  test('drills: card utilisation owed → breakdown, a heatmap day → its transactions, an emergency fund month → its outflow', async ({ page }) => {
    test.slow();
    test.setTimeout(150_000);
    const card = await createCreditCard(api, { name: 'Drill Card', creditLimit: 50000 });
    await createTransaction(api, card.id, { amount: -12000, date: istToday(-4), description: 'Drill card spend' });
    const bank = await createBankAccount(api, { name: 'Drill Bank', openingBalance: 60000 });
    await createTransaction(api, bank.id, { amount: -1000, date: `${ym(istMonth(-6))}-01`, description: 'Drill history start' });
    await createTransaction(api, bank.id, { amount: -5000, date: `${ym(istMonth(-2))}-10`, description: 'EF drill txn' });
    // Outflow in the other full months too, so the median month (the usual outflow) is not ₹0.
    for (const offset of [-5, -4, -3, -1]) {
      await createTransaction(api, bank.id, { amount: -1000, date: `${ym(istMonth(offset))}-05`, description: 'EF usual outflow' });
    }
    await createTransaction(api, bank.id, { amount: -450, date: istToday(-3), description: 'Heat drill txn' });
    await openBoard(page, api, 'Drill board', [
      builtinWidget('util', 'card_utilisation', 50, undefined, { h: 14 }),
      builtinWidget('ef', 'emergency_fund', 50, undefined, { x: 50, h: 14 }),
      builtinWidget('heat', 'spend_heatmap', 100, undefined, { y: 14, h: 16 }),
    ]);

    // Card utilisation: the live figure, and the owed amount opens the card's net-worth breakdown.
    const util = viewCard(page, 'Card utilisation');
    const row = util.getByTestId('utilisation-row');
    await expect(row).toContainText('Drill Card');
    await expect(row).toContainText('24.0%');
    await expect(row).not.toContainText('Over 30%');
    await row.getByRole('button', { name: /view Drill Card balance breakdown/ }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText('Drill Card');
    await expect(dialog.getByRole('heading', { name: 'Drill Card', level: 3 })).toBeVisible();
    await expect(dialog.locator('li[data-op="equals"]')).toContainText('12,000');
    await expect(dialog.getByRole('region', { name: 'Transactions' }).locator('tbody tr')).toContainText(['Drill card spend']);
    await dialog.locator('[data-slot="dialog-footer"]').getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Spending calendar: a day with spend opens that day's transactions.
    const day = ddmmyyyy(istToday(-3));
    const cell = viewCard(page, 'Spending calendar').getByRole('button', { name: new RegExp(`^${escapeRegExp(day)}: `) });
    await cell.click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Spending on ${day}`)).toBeVisible();
    await expect(dialog.locator('tbody tr')).toHaveCount(1);
    await expect(dialog.locator('tbody tr')).toContainText('Heat drill txn');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Emergency fund: a month's bar opens that month's counted outflow.
    const label = monthLabel(-2);
    const ef = viewCard(page, 'Emergency fund');
    await expect(ef.getByTestId('emergency-months')).toBeVisible();
    await ef.getByRole('button', { name: `${label}: ₹5,000 outflow` }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Outflow · ${label}`)).toBeVisible();
    await expect(dialog.locator('tbody tr')).toHaveCount(1);
    await expect(dialog.locator('tbody tr')).toContainText('EF drill txn');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Duplicate as my report on template built-ins saves a report with the same data (a reward window copy says it is fixed)', async ({ page }) => {
    test.slow();
    const bank = await createBankAccount(api, { name: 'Dup Bank', openingBalance: 3000 });
    await createTransaction(api, bank.id, { amount: -275, date: istToday(-12), description: 'Dup spend' });
    const reward = await createRewardCard(api, { name: 'Dup Card' });
    await createMilestone(api, reward.account.id, { name: 'Dup 10k', threshold: 10000 });
    await spend(api, reward.account.id, { amount: 700, date: istToday() });
    await openBoard(page, api, 'Duplicate board', [
      builtinWidget('heat', 'spend_heatmap', 100, { months: 3 }, { h: 16 }),
      builtinWidget('ms', 'milestone_progress', 50, { accountId: reward.account.id }, { y: 16, h: 14 }),
    ]);

    await openMenu(page, viewCard(page, 'Spending calendar'), 'Duplicate as my report');
    await expectToast(page, 'Saved "Spending calendar" to your reports');
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Spending calendar'))
      .toBe(true);
    const heatReport = (await api.GET('/api/v1/reports')).data!.find((r) => r.name === 'Spending calendar')!;
    const heatBuiltin = await runBuiltin(api, 'spend_heatmap', { months: 3 });
    expectStatus(heatBuiltin, 200);
    expect(await runSaved(api, heatReport.id)).toEqual(heatBuiltin.data);

    await openMenu(page, viewCard(page, 'Milestone progress'), 'Duplicate as my report');
    await expectToast(page, 'Saved "Milestone progress" to your reports');
    await expectToast(page, `This copy is fixed to the window open on ${ddmmyyyy(istToday())}.`);
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Milestone progress'))
      .toBe(true);
    const msReport = (await api.GET('/api/v1/reports')).data!.find((r) => r.name === 'Milestone progress')!;
    const msBuiltin = await runBuiltin(api, 'milestone_progress', { accountId: reward.account.id });
    expectStatus(msBuiltin, 200);
    expect(await runSaved(api, msReport.id)).toEqual(msBuiltin.data);
  });

  test('@mobile live utilisation on the accounts list, the card page and the Statements summary', async ({ page }) => {
    test.slow();
    const card = await createCreditCard(api, { name: 'Util UI Card', creditLimit: 50000 });
    await createTransaction(api, card.id, { amount: -20000, date: istToday(-2), description: 'Util UI spend' });

    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
    await expect(page.locator('main').getByText('40.0%').first()).toBeVisible();

    await page.goto(`/accounts/${card.id}`);
    const main = page.locator('main');
    await expect(main.getByText('Utilisation 40.0%')).toBeVisible();
    await expect(main.getByText('₹50,000.00').first()).toBeVisible();

    // Paid off and then some: in credit is 0%, not the absolute balance.
    await createTransaction(api, card.id, { amount: 30000, date: istToday(-1), description: 'Util UI overpay' });
    await page.reload();
    await expect(main.getByText('Utilisation 0.0%')).toBeVisible();
    await page.goto('/accounts');
    await expect(page.locator('main').getByText('0.0%', { exact: true }).first()).toBeVisible();

    // The Statements dialog's cycle summary shows the same live figure as the account.
    const bill = await seedCardBill(api, { name: 'Util Bill Card', last4: '7702', dueInDays: 5 });
    await createTransaction(api, bill.cardId, { amount: -9000, date: istToday(), description: 'After the bill' });
    const account = await api.GET('/api/v1/accounts/{id}', { params: { path: { id: bill.cardId } } });
    expectStatus(account, 200);
    const pct = Number((account.data as unknown as { utilizationPct: number }).utilizationPct);
    await page.goto(`/accounts/${bill.cardId}`);
    const dialog = page.getByRole('dialog').filter({ hasText: 'Card Cycle Summary' });
    await expect(async () => {
      await page.locator('main').getByRole('button', { name: 'Statements', exact: true }).click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await expect(dialog.getByText(`${pct.toFixed(1)}%`, { exact: true })).toBeVisible();
  });
});
