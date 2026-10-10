import fs from 'node:fs';

import type { Locator, Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createBrokerAccount } from '../fixtures/seed/accounts';
import { generateIsin, generateYahooSymbol, resolveInstrument, trade, uniqueSeedSuffix } from '../fixtures/seed/investments';
import { createDashboard, createReport, fixedMonth, widget } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import {
  dayOf,
  ddmmyyyy,
  type Filter,
  inMonth,
  monthBefore,
  PREVIOUS_PERIOD,
  underlyingBuiltin,
} from '../fixtures/seed/underlying';
import { expect, test } from '../fixtures/test';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yy = (year: number) => String(year % 100).padStart(2, '0');

/** A whole calendar month as the CSV file name writes it: "Aug 26" (the year always present). */
function monthFileLabel(m: { year: number; month: number }): string {
  return `${MONTHS[m.month - 1]} ${yy(m.year)}`;
}

/** The IST calendar month of today, offset by whole months. */
function istMonth(offset = 0): { year: number; month: number } {
  const [y, m] = istToday().split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** A day of a month as the app prints dates: "2 Oct 26". */
function dayLabel(m: { year: number; month: number }, day: number): string {
  return `${day} ${MONTHS[m.month - 1]} ${yy(m.year)}`;
}

/** Today as a one-day file label: "9 Oct 26". */
function todayFileLabel(): string {
  const [y, m, d] = istToday().split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${yy(y)}`;
}

function widgetCard(page: Page, title: string): Locator {
  return page.getByTestId('dashboard-widget').filter({
    has: page.getByRole('heading', { name: title, level: 3, exact: true }),
  });
}

const bodyRows = (scope: Locator) => scope.locator('tbody tr');

/**
 * The spend of seeded row k (1-based): 100 + ((7k + 5) mod 27) × 10. For 27 rows that is every
 * value 100…360 once, in an order that differs from the date order (row k is dated day k).
 */
const spendOf = (k: number) => 100 + ((7 * k + 5) % 27) * 10;
const rowName = (k: number) => `VUD row ${String(k).padStart(2, '0')}`;

interface SpendSeed {
  account: { id: string; name: string };
  current: { from: string; to: string; year: number; month: number };
  previous: { from: string; to: string; year: number; month: number };
  ids: Record<string, string>;
}

/**
 * `count` debits in fixedMonth (row k on day k, spend spendOf(k)) and three in the month before
 * (VUD prev 1/2/3: 50, 50, 400 on days 4/9/21), all on one bank account.
 */
async function seedSpend(api: ApiClient, count: number): Promise<SpendSeed> {
  const current = fixedMonth();
  const previous = monthBefore(current);
  const account = await createBankAccount(api, { name: `VUD UI Bank ${uniqueSeedSuffix()}`, openingBalance: 100000 });
  const ids: Record<string, string> = {};
  for (let k = 1; k <= count; k += 1) {
    const t = await createTransaction(api, account.id, { amount: -spendOf(k), date: dayOf(current, k), description: rowName(k) });
    ids[rowName(k)] = t.id;
  }
  const prev: Array<[string, number, number]> = [
    ['VUD prev 1', 50, 4],
    ['VUD prev 2', 50, 9],
    ['VUD prev 3', 400, 21],
  ];
  for (const [description, spend, day] of prev) {
    await createTransaction(api, account.id, { amount: -spend, date: dayOf(previous, day), description });
  }
  return { account, current, previous, ids };
}

/** A saved spend KPI over the seeded account and month, compared with the month before. */
async function spendKpi(api: ApiClient, name: string, seed: SpendSeed) {
  const filters: Filter[] = [{ field: 'account', operator: 'is', value: seed.account.name }, inMonth(seed.current)];
  return createReport(api, {
    name,
    type: 'KPI',
    datasource: 'transactions',
    definition: { measure: 'spend', aggregation: 'sum', filters, comparison: PREVIOUS_PERIOD },
  } as never);
}

async function dashboardWith(api: ApiClient, name: string, reportIds: string[]) {
  return createDashboard(api, {
    name,
    widgets: reportIds.map((id, i) => widget(id, { x: 0, y: i * 16, w: 100, h: 16 })),
  } as never);
}

test.describe('KPI underlying data dialog (@ui)', () => {
  let currentUser: CreatedUser;
  let api: ApiClient;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-vud');
    api = makeApi(currentUser.cookie);
    await loginContext(context, currentUser.cookie);
  });

  test('a KPI widget value opens its rows: chips, no count or sum under them, server paging, header sort, previous period and a CSV in the same order', async ({
    page,
  }) => {
    test.slow();
    const seed = await seedSpend(api, 27);
    const report = await spendKpi(api, 'VUD Spend', seed);
    const board = await dashboardWith(api, 'VUD Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    const card = widgetCard(page, 'VUD Spend');
    const value = card.getByRole('button', { name: 'View underlying data' });
    // 100 + 110 + … + 360 = 6210.
    await expect(value).toHaveText('₹6,210.00');
    await value.click();

    const vud = page.getByRole('dialog', { name: 'VUD Spend' });
    await expect(vud).toBeVisible();
    await expect(vud.getByText('₹6,210.00', { exact: true })).toBeVisible();
    await expect(vud.getByRole('list', { name: 'Filters' }).getByRole('listitem')).toHaveText([
      `Account is ${seed.account.name}`,
      `Date Between ${ddmmyyyy(seed.current.from)} and ${ddmmyyyy(seed.current.to)}`,
    ]);
    await expect(vud.getByRole('columnheader')).toHaveText(['Date', 'Description', 'Account', 'Category', 'Spend']);

    // Default order: newest first, 25 to a page.
    const rows = bodyRows(vud);
    await expect(rows).toHaveCount(25);
    await expect(rows.first()).toContainText(rowName(27));
    await expect(rows.last()).toContainText(rowName(3));
    // The header carries the figure: nothing under the rows restates it or counts them.
    await expect(vud.getByText(/^Sum /)).toHaveCount(0);
    await expect(vud.getByText(/27 rows/)).toHaveCount(0);
    await expect(vud.getByText('1 / 2')).toBeVisible();
    await vud.getByRole('button', { name: 'Next page' }).click();
    await expect(vud.getByText('2 / 2')).toBeVisible();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(rowName(2));
    await expect(rows.nth(1)).toContainText(rowName(1));

    // Header sort cycles asc → desc → default; each change goes back to the first page.
    const spendHeader = vud.getByRole('columnheader', { name: 'Spend' });
    await vud.getByRole('button', { name: 'Spend', exact: true }).click();
    await expect(spendHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(vud.getByText('1 / 2')).toBeVisible();
    // Ascending spend: 100 (row 7), 110 (row 11), 120 (row 15) …
    await expect(rows.nth(0)).toContainText(rowName(7));
    await expect(rows.nth(1)).toContainText(rowName(11));
    await expect(rows.nth(2)).toContainText(rowName(15));
    // … and the sort holds on the next page: 350 (row 26), 360 (row 3).
    await vud.getByRole('button', { name: 'Next page' }).click();
    await expect(vud.getByText('2 / 2')).toBeVisible();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(rowName(26));
    await expect(rows.nth(1)).toContainText(rowName(3));
    await expect(spendHeader).toHaveAttribute('aria-sort', 'ascending');

    await vud.getByRole('button', { name: 'Spend', exact: true }).click();
    await expect(spendHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(vud.getByText('1 / 2')).toBeVisible();
    await expect(rows.first()).toContainText(rowName(3));
    await vud.getByRole('button', { name: 'Spend', exact: true }).click();
    await expect(spendHeader).toHaveAttribute('aria-sort', 'none');
    await expect(rows.first()).toContainText(rowName(27));

    // Previous period: its own value, rows and date chip.
    const previousTab = vud.getByRole('tab', { name: /^Previous · / });
    await expect(previousTab).toHaveText(new RegExp(`^Previous · ${MONTHS[seed.previous.month - 1]}( \\d\\d)? · ₹500\\.00$`));
    await previousTab.click();
    await expect(previousTab).toHaveAttribute('aria-selected', 'true');
    await expect(vud.getByText('₹500.00', { exact: true })).toBeVisible();
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('VUD prev 3');
    await expect(rows.nth(2)).toContainText('VUD prev 1');
    await expect(vud.getByRole('list', { name: 'Filters' }).getByRole('listitem').nth(1)).toHaveText(
      `Date Between ${ddmmyyyy(seed.previous.from)} and ${ddmmyyyy(seed.previous.to)}`
    );

    // Back on this period, sorted by spend descending: the CSV holds every row in that order.
    await vud.getByRole('tab', { name: 'This period' }).click();
    await expect(vud.getByText('₹6,210.00', { exact: true })).toBeVisible();
    await expect(rows).toHaveCount(25);
    await vud.getByRole('button', { name: 'Spend', exact: true }).click();
    await vud.getByRole('button', { name: 'Spend', exact: true }).click();
    await expect(spendHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(rows.first()).toContainText(rowName(3));

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      vud.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`VUD Spend ${monthFileLabel(seed.current)}.csv`);
    const bytes = fs.readFileSync((await download.path())!);
    expect([...bytes.subarray(0, 3)], 'UTF-8 BOM').toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.subarray(3).toString('utf8').split('\r\n').filter((l) => l !== '');
    expect(lines[0]).toBe('Date,Description,Account,Category,Spend');
    expect(lines).toHaveLength(28);
    expect(lines[1]).toBe(`${ddmmyyyy(dayOf(seed.current, 3))},${rowName(3)},${seed.account.name},,360.00`);
    expect(lines[27]).toBe(`${ddmmyyyy(dayOf(seed.current, 7))},${rowName(7)},${seed.account.name},,100.00`);

    await vud.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the widget menu opens the same dialog, and a transaction row opens that transaction', async ({ page }) => {
    const seed = await seedSpend(api, 3);
    const report = await spendKpi(api, 'VUD Menu', seed);
    const board = await dashboardWith(api, 'VUD Menu Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    const card = widgetCard(page, 'VUD Menu');
    // 220 + 290 + 360.
    await expect(card.getByRole('button', { name: 'View underlying data' })).toHaveText('₹870.00');
    await card.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'View underlying data' }).click();

    const vud = page.getByRole('dialog', { name: 'VUD Menu' });
    await expect(vud.getByText('₹870.00', { exact: true })).toBeVisible();
    await expect(bodyRows(vud)).toHaveCount(3);

    await bodyRows(vud).filter({ hasText: rowName(2) }).click();
    // The transaction opens over the rows (which leave the accessibility tree while it is up).
    const detail = page.getByRole('dialog').filter({ hasText: rowName(2) });
    await expect(detail.getByText('-₹290.00')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Edit' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    // Closing the transaction returns to the rows.
    await expect(bodyRows(vud)).toHaveCount(3);
  });

  test('a this-month KPI names its CSV after the report and the month, for each period, and lists an empty month as such', async ({
    page,
  }) => {
    const report = await createReport(api, {
      name: 'VUD This Month',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [{ field: 'date', operator: 'this_month' }] },
    } as never);
    const board = await dashboardWith(api, 'VUD Month Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    await widgetCard(page, 'VUD This Month').getByRole('button', { name: 'View underlying data' }).click();
    const vud = page.getByRole('dialog', { name: 'VUD This Month' });
    await expect(vud.getByText('No rows in this period')).toBeVisible();
    await expect(vud.getByRole('list', { name: 'Filters' }).getByRole('listitem')).toHaveText(['Date This month']);

    const current = await Promise.all([
      page.waitForEvent('download'),
      vud.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(current[0].suggestedFilename()).toBe(`VUD This Month ${monthFileLabel(istMonth())}.csv`);
    // No rows: only the header.
    const body = fs.readFileSync((await current[0].path())!).subarray(3).toString('utf8');
    expect(body).toBe('Date,Description,Account,Category,Spend\r\n');

    await vud.getByRole('tab', { name: /^Previous · / }).click();
    const previous = await Promise.all([
      page.waitForEvent('download'),
      vud.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(previous[0].suggestedFilename()).toBe(`VUD This Month ${monthFileLabel(istMonth(-1))}.csv`);
  });

  test('net worth: asset and liability groups with their totals in the header rows, what is not counted, and each row breaks down to its ledger', async ({ page }) => {
    test.slow();
    const savings = await createBankAccount(api, { name: 'NW Savings', openingBalance: 10000 });
    await createTransaction(api, savings.id, { amount: 2500, date: istToday(-5), description: 'NW refund' });
    await createTransaction(api, savings.id, { amount: -1200, date: istToday(-4), description: 'NW rent' });
    const overdrawn = await createBankAccount(api, { name: 'NW Overdrawn', openingBalance: 100 });
    await createTransaction(api, overdrawn.id, { amount: -600, date: istToday(-2), description: 'NW big spend' });
    await createBankAccount(api, { name: 'NW Hidden', openingBalance: 50, excludeFromNetAsset: true });
    const closed = await createBankAccount(api, { name: 'NW Closed', openingBalance: 70 });
    expectStatus(
      await api.POST('/api/v1/accounts/{id}/close', { params: { path: { id: closed.id } }, body: { closedOn: istToday(-1) } }),
      200
    );
    const broker = await createBrokerAccount(api, { name: 'NW Broker', cashBalance: 5000 });
    const symbol = generateYahooSymbol('NWU');
    const stock = await resolveInstrument(api, {
      type: 'stock',
      name: `NW Stock ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });
    await trade(api, { brokerAccountId: broker.id, instrumentId: stock.id, type: 'buy', quantity: 10, price: 100, tradeDate: istToday(-30) });
    // 11300 + (5000 + 10 × 999.99) − 500; wait for the trade's price fetch to land.
    await expect.poll(async () => (await underlyingBuiltin(api, 'net_worth')).value).toBe(25799.9);

    await page.goto('/dashboard');
    const value = widgetCard(page, 'Net worth').getByRole('button', { name: 'View underlying data' });
    await expect(value).toHaveText('₹25,799.90');
    await value.click();

    const vud = page.getByRole('dialog', { name: 'Net worth' });
    await expect(vud.getByText('₹25,799.90', { exact: true })).toBeVisible();
    // Grouped by side in the default order (largest first within a side). Each group's header
    // row carries the side's total (all rows, not just the page) in the Net value column, and the
    // Side column itself is left out while grouped: the header already says it.
    const rows = bodyRows(vud);
    const grouped = [/^Asset₹26,299\.90$/, /NW Broker/, /NW Savings/, /^Liability-₹500\.00$/, /NW Overdrawn/];
    await expect(rows).toHaveText(grouped);
    await expect(vud.getByRole('columnheader')).toHaveText(['Name', 'Kind', 'Net value']);
    await expect(rows.first().getByRole('cell').last()).toHaveText('₹26,299.90');
    // Kind cells read as their labels, never the stored values.
    await expect(rows.filter({ hasText: 'NW Savings' })).toContainText('Bank account');
    await expect(rows.filter({ hasText: 'NW Broker' })).toContainText('Broker');
    await expect(vud.locator('tbody')).not.toContainText('bank_account');
    // No sum, totals or row count under the rows.
    await expect(vud.getByText(/^Sum /)).toHaveCount(0);
    await expect(vud.getByText(/^Assets /)).toHaveCount(0);
    await expect(vud.getByText(/^Liabilities /)).toHaveCount(0);
    await expect(vud.getByText(/^3 rows/)).toHaveCount(0);

    // What the total leaves out, collapsed until asked for.
    const notCounted = vud.getByRole('button', { name: 'Not counted (2)' });
    await expect(notCounted).toHaveAttribute('aria-expanded', 'false');
    await expect(vud.getByText('NW Hidden · Excluded from net worth · ₹50.00')).toHaveCount(0);
    await notCounted.click();
    await expect(notCounted).toHaveAttribute('aria-expanded', 'true');
    await expect(vud.getByText('NW Hidden · Excluded from net worth · ₹50.00')).toBeVisible();
    await expect(vud.getByText(`NW Closed · Closed on ${ddmmyyyy(istToday(-1))} · ₹70.00`)).toBeVisible();

    // A bank row: its ledger, its transactions, then Back to the list.
    await rows.filter({ hasText: 'NW Savings' }).click();
    await expect(vud.getByRole('heading', { name: 'NW Savings', level: 3 })).toBeVisible();
    await expect(vud.getByText('Asset · Bank account')).toBeVisible();
    await expect(vud.locator('li[data-op]')).toHaveText([
      /^Opening balance₹10,000\.00$/,
      /^\+Credits \(1\)₹2,500\.00$/,
      /^−Debits \(1\)₹1,200\.00$/,
      /^=Balance₹11,300\.00$/,
    ]);
    const transactions = vud.getByRole('region', { name: 'Transactions' });
    await expect(bodyRows(transactions)).toHaveText([/NW rent/, /NW refund/]);
    // Inside a breakdown the footer offers only Close: the CSV is the KPI's rows, not this ledger's.
    await expect(vud.getByRole('button', { name: 'Download CSV' })).toHaveCount(0);
    await expect(vud.locator('[data-slot="dialog-footer"]').getByRole('button')).toHaveText(['Close']);
    // Section headers sort the whole section on the server: asc → desc → default.
    const description = transactions.getByRole('button', { name: 'Description', exact: true });
    const descriptionHeader = transactions.getByRole('columnheader', { name: 'Description' });
    await expect(descriptionHeader).toHaveAttribute('aria-sort', 'none');
    await description.click();
    await expect(descriptionHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(bodyRows(transactions)).toHaveText([/NW refund/, /NW rent/]);
    await description.click();
    await expect(descriptionHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(bodyRows(transactions)).toHaveText([/NW rent/, /NW refund/]);
    await description.click();
    await expect(descriptionHeader).toHaveAttribute('aria-sort', 'none');
    await expect(bodyRows(transactions)).toHaveText([/NW rent/, /NW refund/]);
    await vud.getByRole('button', { name: 'Back' }).click();
    await expect(rows).toHaveText(grouped);
    // Back in the list, Download CSV returns.
    await expect(vud.getByRole('button', { name: 'Download CSV' })).toBeVisible();

    // A broker row: cash plus holdings; a holding opens its positions breakdown.
    await rows.filter({ hasText: 'NW Broker' }).click();
    await expect(vud.getByRole('heading', { name: 'NW Broker', level: 3 })).toBeVisible();
    await expect(vud.locator('li[data-op]')).toHaveText([
      /^Cash balance₹5,000\.00$/,
      /^\+Holdings at market value \(1\)₹9,999\.90$/,
      /^=Balance₹14,999\.90$/,
    ]);
    const holdings = vud.getByRole('region', { name: 'Holdings' });
    await bodyRows(holdings).filter({ hasText: stock.name }).click();
    await expect(vud.getByRole('heading', { name: stock.name, level: 3 })).toBeVisible();
    await expect(vud.locator('li[data-op="start"]')).toHaveText(/^Cost of open lots₹1,000\.00$/);
    await expect(vud.locator('li[data-op="add"]')).toHaveText(/^\+Unrealised gain₹8,999\.90$/);
    await expect(vud.locator('li[data-op="equals"]')).toHaveText(/^=Current value₹9,999\.90$/);
    await expect(bodyRows(vud.getByRole('region', { name: 'Open lots' }))).toHaveCount(1);
    await vud.getByRole('button', { name: 'Back' }).click();
    await expect(vud.getByRole('heading', { name: 'NW Broker', level: 3 })).toBeVisible();
    await vud.getByRole('button', { name: 'Back' }).click();

    // A user sort replaces the grouped order, so the group headers go and the Side column returns.
    await vud.getByRole('button', { name: 'Net value', exact: true }).click();
    await expect(vud.getByRole('columnheader', { name: 'Net value' })).toHaveAttribute('aria-sort', 'ascending');
    await expect(rows).toHaveText([/NW Overdrawn/, /NW Savings/, /NW Broker/]);
    await expect(vud.getByRole('columnheader')).toHaveText(['Name', 'Kind', 'Side', 'Net value']);
    await expect(rows.filter({ hasText: 'NW Overdrawn' })).toContainText('Liability');
    await expect(rows.filter({ hasText: 'NW Savings' })).toContainText('Asset');

    // Net worth has no date range: the CSV is named for today.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      vud.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`Net worth ${todayFileLabel()}.csv`);
    // The file prints kind and side by their labels, in the sorted order.
    const csvBody = fs.readFileSync((await download.path())!).subarray(3).toString('utf8');
    expect(csvBody.split('\r\n').filter(Boolean)).toEqual([
      'Name,Kind,Side,Net value',
      'NW Overdrawn,Bank account,Liability,-500.00',
      'NW Savings,Bank account,Asset,11300.00',
      'NW Broker,Broker,Asset,14999.90',
    ]);
  });

  test('a table widget sorts by its headers on the server: paging keeps the sort, a new sort starts at page one, a reload drops it', async ({
    page,
  }) => {
    test.slow();
    const month = fixedMonth();
    const account = await createBankAccount(api, { name: `Sort Bank ${uniqueSeedSuffix()}`, openingBalance: 0 });
    // 55 credits, row k on day ⌈k/2⌉ with amount 100 + ((7k) mod 55) × 10: every value 100…640 once.
    const amountOf = (k: number) => 100 + ((7 * k) % 55) * 10;
    const name = (k: number) => `Sort row ${String(k).padStart(2, '0')}`;
    for (let k = 1; k <= 55; k += 1) {
      await createTransaction(api, account.id, { amount: amountOf(k), date: dayOf(month, Math.ceil(k / 2)), description: name(k) });
    }
    const ascending = Array.from({ length: 55 }, (_, i) => i + 1).sort((a, b) => amountOf(a) - amountOf(b));
    const report = await createReport(api, {
      name: 'Sort Table',
      type: 'TABLE',
      datasource: 'transactions',
      definition: {
        mode: 'raw',
        columns: ['date', 'description', 'amount'],
        filters: [inMonth(month)],
        sort: [{ key: 'description', direction: 'asc' }],
      },
    } as never);
    const board = await dashboardWith(api, 'Sort Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    const card = widgetCard(page, 'Sort Table');
    const rows = bodyRows(card);
    // The saved order (description asc), 50 to a page.
    await expect(rows).toHaveCount(50);
    await expect(rows.first()).toContainText(name(1));
    await expect(card.getByText('1 / 2')).toBeVisible();

    const amountHeader = card.getByRole('columnheader', { name: 'Amount' });
    await expect(amountHeader).toHaveAttribute('aria-sort', 'none');
    await card.getByRole('button', { name: 'Amount', exact: true }).click();
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(rows.first()).toContainText(name(ascending[0]));
    await expect(rows.nth(49)).toContainText(name(ascending[49]));

    await card.getByRole('button', { name: 'Next page' }).click();
    await expect(card.getByText('2 / 2')).toBeVisible();
    await expect(rows).toHaveCount(5);
    await expect(rows).toHaveText(ascending.slice(50).map((k) => new RegExp(name(k))));
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');

    // A new sort goes back to page one.
    await card.getByRole('button', { name: 'Amount', exact: true }).click();
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(card.getByText('1 / 2')).toBeVisible();
    await expect(rows.first()).toContainText(name(ascending[54]));

    // The sort is for this visit only: the report keeps its saved order.
    await page.reload();
    await expect(amountHeader).toHaveAttribute('aria-sort', 'none');
    await expect(rows.first()).toContainText(name(1));
    const saved = await api.GET('/api/v1/reports/{id}', { params: { path: { id: report.id } } });
    expect((saved.data?.definition as { sort?: unknown }).sort).toEqual([{ key: 'description', direction: 'asc' }]);
  });

  test('the builder preview KPI value opens its underlying rows', async ({ page }) => {
    const seed = await seedSpend(api, 3);
    const report = await spendKpi(api, 'VUD Builder', seed);

    await page.goto(`/reports/${report.id}`);
    await expect(page.getByRole('heading', { name: 'Edit Report' })).toBeVisible();
    // A saved report's preview runs on mount.
    const value = page.getByRole('button', { name: 'View underlying data' });
    await expect(value).toHaveText('₹870.00');
    await value.click();

    const vud = page.getByRole('dialog', { name: 'VUD Builder' });
    await expect(vud.getByText('₹870.00', { exact: true })).toBeVisible();
    await expect(bodyRows(vud)).toHaveText([new RegExp(rowName(3)), new RegExp(rowName(2)), new RegExp(rowName(1))]);
    await vud.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('@mobile the dialog is a bottom sheet with the rows as cards on a phone (centred with a table on desktop); sort, the previous period and a transaction open from it', async ({
    page,
    isMobile,
  }) => {
    const seed = await seedSpend(api, 3);
    const report = await spendKpi(api, 'VUD Phone', seed);
    const board = await dashboardWith(api, 'VUD Phone Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    await widgetCard(page, 'VUD Phone').getByRole('button', { name: 'View underlying data' }).click();
    const vud = page.getByRole('dialog', { name: 'VUD Phone' });
    await expect(vud.getByText('₹870.00', { exact: true })).toBeVisible();
    await expect(vud.getByText(/^Sum /)).toHaveCount(0);
    await expect(vud.getByText(/3 rows/)).toHaveCount(0);

    // Phone: anchored to the bottom edge (4px inset), full width. Desktop: centred.
    // Polled, so the open animation has settled.
    const viewport = page.viewportSize()!;
    const geometry = async () => {
      const box = (await vud.boundingBox())!;
      return isMobile
        ? { gapBelow: Math.round(viewport.height - (box.y + box.height)), gapLeft: Math.round(box.x), gapRight: Math.round(viewport.width - box.x - box.width) }
        : { centreOffset: Math.abs(Math.round(box.x + box.width / 2 - viewport.width / 2)) };
    };
    await expect.poll(geometry).toEqual(isMobile ? { gapBelow: 4, gapLeft: 4, gapRight: 4 } : { centreOffset: 0 });
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (isMobile) {
      // Cards, not a table: the description titles each card, the spend is the bold figure, and
      // the other filled columns (date, account) make the muted line under it.
      await expect(vud.locator('table')).toHaveCount(0);
      const cards = vud.getByRole('button', { name: /^VUD row / });
      await expect(cards).toHaveText([new RegExp(rowName(3)), new RegExp(rowName(2)), new RegExp(rowName(1))]);
      const card = cards.filter({ hasText: rowName(2) });
      await expect(card.getByText('₹290.00', { exact: true })).toHaveCSS('font-weight', '600');
      await expect(card.getByText(`${dayLabel(seed.current, 2)} · ${seed.account.name}`, { exact: true })).toBeVisible();

      // No headers to click: the Sort select and the direction toggle sort on the server.
      await vud.getByRole('combobox', { name: 'Sort' }).click();
      await page.getByRole('option', { name: 'Spend', exact: true }).click();
      // Ascending spend: 220 (row 1), 290 (row 2), 360 (row 3).
      await expect(cards).toHaveText([new RegExp(rowName(1)), new RegExp(rowName(2)), new RegExp(rowName(3))]);
      await vud.getByRole('button', { name: 'Sort ascending' }).click();
      await expect(cards).toHaveText([new RegExp(rowName(3)), new RegExp(rowName(2)), new RegExp(rowName(1))]);
      await expect(vud.getByRole('button', { name: 'Sort descending' })).toBeVisible();
      await vud.getByRole('combobox', { name: 'Sort' }).click();
      await page.getByRole('option', { name: 'Default order' }).click();
      await expect(vud.getByRole('button', { name: /^Sort (a|de)scending$/ })).toHaveCount(0);
    } else {
      await expect(bodyRows(vud)).toHaveCount(3);
      await expect(vud.getByRole('combobox', { name: 'Sort' })).toHaveCount(0);
    }

    await vud.getByRole('tab', { name: /^Previous · / }).click();
    await expect(vud.getByText('₹500.00', { exact: true })).toBeVisible();
    const previousRow = isMobile
      ? vud.getByRole('button', { name: /^VUD prev 3/ })
      : bodyRows(vud).filter({ hasText: 'VUD prev 3' });
    await previousRow.click();
    const detail = page.getByRole('dialog').filter({ hasText: 'VUD prev 3' });
    await expect(detail.getByText('-₹400.00')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Edit' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);

    await vud.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
