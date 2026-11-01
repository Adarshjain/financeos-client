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
import { builtinWidget, istMonth, runBuiltin, SHORTCUTS_DEFAULT, ym } from '../fixtures/seed/widgets';
import { expect, test } from '../fixtures/test';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function viewCard(page: Page, id: string): Locator {
  return page.locator(`[data-testid="dashboard-widget"][data-widget-id="${id}"]`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** "02/11/26" (dd/mm/yy) for an ISO date, as Dinero prints dates. */
function ddmmyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

/** A dashboard of built-ins, opened in view mode at /dashboards/{id}. */
async function openBoard(page: Page, api: ApiClient, name: string, widgets: ReturnType<typeof builtinWidget>[]): Promise<string> {
  const dash = await createDashboard(api, { name, isDefault: false, widgets } as never);
  await page.goto(`/dashboards/${dash.id}`);
  await expect(page.getByTestId('dashboard-widget').first()).toBeVisible({ timeout: 45_000 });
  return dash.id;
}

async function openMenu(page: Page, widget: Locator, item: string): Promise<void> {
  await widget.scrollIntoViewIfNeeded();
  await widget.getByRole('button', { name: 'Widget options' }).click();
  await page.getByRole('menuitem', { name: item }).click();
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

    const heat = viewCard(page, 'heat');
    await expect(heat).toContainText('Last 6 months');
    await openMenu(page, heat, 'Widget settings');
    const settings = page.getByRole('dialog', { name: 'Widget settings · Spending calendar' });
    const months = settings.getByRole('spinbutton', { name: 'Months' });
    await expect(months).toHaveValue('6');
    await months.fill('13');
    await expect(settings.getByRole('button', { name: 'Save widget' })).toBeDisabled();
    await months.fill('3');
    await settings.getByRole('button', { name: 'Save widget' }).click();
    await expect(settings).toHaveCount(0);
    await expect(heat).toContainText('Last 3 months');

    const movers = viewCard(page, 'movers');
    await openMenu(page, movers, 'Widget settings');
    const moversSettings = page.getByRole('dialog', { name: 'Widget settings · Top movers' });
    const howMany = moversSettings.getByRole('spinbutton', { name: 'How many' });
    await expect(howMany).toHaveValue('5');
    await howMany.fill('8');
    await moversSettings.getByRole('button', { name: 'Save widget' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Cancel leaves the params alone.
    await openMenu(page, heat, 'Widget settings');
    await settings.getByRole('spinbutton', { name: 'Months' }).fill('11');
    await settings.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(heat).toContainText('Last 3 months');

    await page.reload();
    await expect(viewCard(page, 'heat')).toContainText('Last 3 months', { timeout: 45_000 });
    await openMenu(page, viewCard(page, 'movers'), 'Widget settings');
    await expect(page.getByRole('dialog', { name: 'Widget settings · Top movers' }).getByRole('spinbutton', { name: 'How many' })).toHaveValue('8');
    await page.keyboard.press('Escape');

    expect(await widgetParams(api, id, 'heat')).toEqual({ months: 3 });
    expect(await widgetParams(api, id, 'movers')).toEqual({ n: 8 });
  });

  test('@mobile shortcuts: configure, reorder, tiles navigate, and Add transaction lazily opens its dialog and creates one', async ({ page }) => {
    test.slow();
    test.setTimeout(150_000);
    const bank = await createBankAccount(api, { name: 'Shortcut Bank', openingBalance: 5000 });
    const id = await openBoard(page, api, 'Shortcuts board', [builtinWidget('sc', 'shortcuts', 50, { items: SHORTCUTS_DEFAULT })]);

    const widget = viewCard(page, 'sc');
    const tile = (name: string) => widget.getByRole('link', { name, exact: true }).or(widget.getByRole('button', { name, exact: true }));
    const tileNames = () => widget.getByRole('link').or(widget.getByRole('button', { name: /^(?!Widget options)/ })).allInnerTexts();
    await expect(tile('Add transaction')).toBeVisible();
    expect(await tileNames()).toEqual(['Add transaction', 'Needs review', 'Import', 'Upcoming']);

    // Configure: add Record lending and the bank account, move Record lending up, drop Import.
    await openMenu(page, widget, 'Widget settings');
    const settings = page.getByRole('dialog', { name: 'Widget settings · Shortcuts' });
    const editor = settings.getByTestId('shortcuts-params-editor');
    await expect(editor).toContainText('4 of 12');
    const chosenNames = () => editor.getByRole('button', { name: /^Move up / }).evaluateAll((els) => els.map((el) => (el.getAttribute('aria-label') ?? '').replace('Move up ', '')));
    expect(await chosenNames()).toEqual(['Add transaction', 'Needs review', 'Import', 'Upcoming']);
    const pick = async (label: string) => {
      await editor.getByRole('combobox', { name: 'Shortcuts' }).click();
      await page.getByRole('option', { name: label, exact: true }).click();
      await page.keyboard.press('Escape');
    };
    await pick('Record lending');
    await pick('Shortcut Bank');
    await pick('Import');
    await expect(editor).toContainText('5 of 12');
    await expect.poll(chosenNames).toEqual(['Add transaction', 'Needs review', 'Upcoming', 'Record lending', 'Shortcut Bank']);
    await editor.getByRole('button', { name: 'Move up Record lending' }).click();
    await expect.poll(chosenNames).toEqual(['Add transaction', 'Needs review', 'Record lending', 'Upcoming', 'Shortcut Bank']);
    await settings.getByRole('button', { name: 'Save widget' }).click();
    await expect(settings).toHaveCount(0);

    await expect(tile('Shortcut Bank')).toBeVisible();
    expect(await tileNames()).toEqual(['Add transaction', 'Needs review', 'Record lending', 'Upcoming', 'Shortcut Bank']);
    expect(await widgetParams(api, id, 'sc')).toEqual({
      items: ['action:add-transaction', 'page:/transactions/review', 'action:record-lending', 'page:/upcoming', `account:${bank.id}`],
    });

    // Links go where they say.
    await expect(widget.getByRole('link', { name: 'Shortcut Bank' })).toHaveAttribute('href', `/accounts/${bank.id}`);
    await widget.getByRole('link', { name: 'Upcoming' }).click();
    await page.waitForURL('**/upcoming');
    await page.goBack();
    await expect(viewCard(page, 'sc')).toBeVisible({ timeout: 45_000 });

    // The action's dialog is not on the page until the tile is used.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await viewCard(page, 'sc').getByRole('button', { name: 'Add transaction' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add transaction' });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('321.50');
    await dialog.getByRole('textbox', { name: 'Description' }).fill('Shortcut lunch');
    await dialog.getByRole('combobox', { name: /^Account/ }).click();
    await page.getByRole('option', { name: /Shortcut Bank/ }).click();
    await dialog.getByRole('button', { name: 'Add transaction' }).click();
    await expect(dialog).not.toBeVisible();
    await expect.poll(async () => (await searchAll(api, undefined, 'Shortcut lunch')).length).toBe(1);
    const [txn] = await searchAll(api, undefined, 'Shortcut lunch');
    expect(txn.accountId).toBe(bank.id);
    expect(Math.abs(Number(txn.amount))).toBe(321.5);
  });

  test('lending balances: biggest first, and the amount opens that person’s breakdown', async ({ page }) => {
    test.slow();
    const friend = await createCounterparty(api, { name: 'Settle Friend' });
    await addLending(api, { counterpartyId: friend.id, direction: 'lent', amount: 2500, entryDate: istToday(-6) });
    await addLending(api, { newCounterpartyName: 'Settle Lender', direction: 'borrowed', amount: 9000, entryDate: istToday(-6) });
    await openBoard(page, api, 'Lending board', [builtinWidget('lb', 'lending_balances', 50)]);

    const widget = viewCard(page, 'lb');
    const rows = widget.getByRole('list', { name: 'Balances' }).getByRole('listitem');
    // Biggest first: what you owe the lender, then what the friend owes you.
    await expect(rows).toHaveCount(2, { timeout: 45_000 });
    await expect(rows.nth(0)).toContainText('Settle Lender');
    await expect(rows.nth(0)).toContainText('You owe');
    await expect(rows.nth(1)).toContainText('Settle Friend');
    await expect(rows.nth(1)).toContainText('Owes you');

    await rows.nth(1).getByRole('button', { name: '₹2,500' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settle Friend' });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog).toContainText('They owe you ₹2,500');
    await expect(dialog.getByRole('region', { name: 'Entries' }).locator('tbody tr, [role="row"]').filter({ hasText: 'Principal' })).toHaveCount(1);
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
    const util = viewCard(page, 'util');
    await expect(util).toContainText('Drill Card', { timeout: 45_000 });
    await expect(util).toContainText('24%');
    await expect(util).not.toContainText('Over 30%');
    await util.getByRole('button', { name: '₹12,000' }).click();
    let dialog = page.getByRole('dialog', { name: 'Drill Card' });
    await expect(dialog).toContainText('Outstanding ₹12,000', { timeout: 30_000 });
    await expect(dialog.getByRole('region', { name: 'Transactions' }).getByRole('row', { name: /Drill card spend/ })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Spending calendar: a day with spend opens that day's transactions.
    const day = ddmmyy(istToday(-3));
    const cell = viewCard(page, 'heat').getByRole('button', { name: new RegExp(`^${escapeRegExp(day)}: `) });
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    dialog = page.getByRole('dialog', { name: new RegExp(`Spending on ${escapeRegExp(day)}`) });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole('row').filter({ hasText: 'Heat drill txn' })).toHaveCount(1);
    await expect(dialog.getByRole('row').filter({ hasText: 'Drill card spend' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Emergency fund: a month's bar opens that month's counted outflow.
    const ef = viewCard(page, 'ef');
    await ef.scrollIntoViewIfNeeded();
    const bars = ef.locator('[data-bar]');
    await expect(bars.first()).toBeVisible({ timeout: 45_000 });
    // The bars follow the chart's data table, one row per month.
    const months = await ef.getByRole('table', { name: 'Chart data' }).getByRole('rowheader').allInnerTexts();
    const target = months.indexOf(MONTHS[istMonth(-2).month - 1]);
    expect(target, `months: ${JSON.stringify(months)}`).toBeGreaterThanOrEqual(0);
    await bars.nth(target).click();
    dialog = page.getByRole('dialog', { name: new RegExp(`Outflow.*${escapeRegExp(MONTHS[istMonth(-2).month - 1])}`) });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole('row').filter({ hasText: 'EF drill txn' })).toHaveCount(1);
    await expect(dialog.getByRole('row').filter({ hasText: 'EF usual outflow' })).toHaveCount(0);
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

    await openMenu(page, viewCard(page, 'heat'), 'Duplicate as my report');
    await expect(page.getByText(/Report "Spending calendar" saved/)).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Spending calendar'))
      .toBe(true);
    const heatReport = (await api.GET('/api/v1/reports')).data!.find((r) => r.name === 'Spending calendar')!;
    const heatBuiltin = await runBuiltin(api, 'spend_heatmap', { months: 3 });
    expectStatus(heatBuiltin, 200);
    expect(await runSaved(api, heatReport.id)).toEqual(heatBuiltin.data);

    await openMenu(page, viewCard(page, 'ms'), 'Duplicate as my report');
    await expect(
      page.getByText(`Report "Milestone progress" saved. This copy is fixed to the window open on ${ddmmyy(istToday())}`),
    ).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => ((await api.GET('/api/v1/reports')).data ?? []).some((r) => r.name === 'Milestone progress'))
      .toBe(true);
    const msReport = (await api.GET('/api/v1/reports')).data!.find((r) => r.name === 'Milestone progress')!;
    const msBuiltin = await runBuiltin(api, 'milestone_progress', { accountId: reward.account.id });
    expectStatus(msBuiltin, 200);
    expect(await runSaved(api, msReport.id)).toEqual(msBuiltin.data);
  });

  test('@mobile live utilisation on the accounts list and the card page', async ({ page }) => {
    test.slow();
    const card = await createCreditCard(api, { name: 'Util UI Card', creditLimit: 50000 });
    await createTransaction(api, card.id, { amount: -20000, date: istToday(-2), description: 'Util UI spend' });

    await page.goto('/accounts');
    await expect(page.getByRole('main').getByText('Util UI Card')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('main').getByText(/^40%/).filter({ visible: true }).first()).toBeVisible();

    await page.goto(`/accounts/${card.id}`);
    const main = page.getByRole('main');
    await expect(main.getByText('Limit used')).toBeVisible({ timeout: 45_000 });
    await expect(main.getByText(/^40%/).filter({ visible: true }).first()).toBeVisible();
    await expect(main.getByText('of ₹50,000 limit')).toBeVisible();

    // Paid off and then some: in credit is 0%, not the absolute balance.
    await createTransaction(api, card.id, { amount: 30000, date: istToday(-1), description: 'Util UI overpay' });
    await page.reload();
    await expect(main.getByText(/^0%/).filter({ visible: true }).first()).toBeVisible({ timeout: 45_000 });
    await page.goto('/accounts');
    await expect(page.getByRole('main').getByText(/^0%/).filter({ visible: true }).first()).toBeVisible({ timeout: 45_000 });

    // A card with a bill: its page shows the same live figure the API reports.
    const bill = await seedCardBill(api, { name: 'Util Bill Card', last4: '7702', dueInDays: 5 });
    await createTransaction(api, bill.cardId, { amount: -9000, date: istToday(), description: 'After the bill' });
    const account = await api.GET('/api/v1/accounts/{id}', { params: { path: { id: bill.cardId } } });
    expectStatus(account, 200);
    const pct = Number((account.data as unknown as { utilizationPct: number }).utilizationPct);
    await page.goto(`/accounts/${bill.cardId}`);
    await expect(page.getByRole('main').getByText('Limit used')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('main').getByText(new RegExp(`^${Math.round(pct)}%`)).filter({ visible: true }).first()).toBeVisible();
  });
});
