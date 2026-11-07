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

const widgetCard = (page: Page) => page.getByTestId('dashboard-widget').first();

/**
 * The body rows of a DataTable (the header row left out). A tappable row (onRowSelect) exposes
 * role=button instead of role=row, and only body rows hold cells.
 */
const bodyRows = (scope: Locator) =>
  scope.getByRole('row').or(scope.getByRole('button')).filter({ has: scope.page().getByRole('cell') });

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

  const dialogOf = (page: Page) => page.getByRole('dialog', { name: /^Underlying data/ });
  const pickSort = async (page: Page, vud: Locator, option: string) => {
    if (option === 'Default order') {
      await vud.getByRole('button', { name: 'Reset filter' }).first().click();
      return;
    }
    // Once an order is chosen the trigger becomes a chip with a reset; start again from the plain Sort button.
    const reset = vud.getByRole('button', { name: 'Reset filter' });
    if (await reset.count()) await reset.first().click();
    await vud.getByRole('button', { name: 'Sort', exact: true }).first().click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };

  test('a KPI widget value opens its rows: server paging, sort, previous period and a CSV in the same order', async ({ page }) => {
    test.slow();
    const seed = await seedSpend(api, 27);
    const report = await spendKpi(api, 'VUD Spend', seed);
    const board = await dashboardWith(api, 'VUD Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    const value = widgetCard(page).getByRole('button', { name: /₹/ });
    // 100 + 110 + … + 360 = 6210.
    await expect(value).toHaveText('₹6,210', { timeout: 45_000 });
    await value.click();

    const vud = dialogOf(page);
    await expect(vud).toBeVisible();
    await expect(vud.getByText(/27 transactions make up this figure/)).toBeVisible({ timeout: 45_000 });
    await expect(vud.getByRole('columnheader')).toHaveText(['Date', 'Description', 'Account', 'Category', 'Spend']);

    // Default order: newest first, 5 to a page.
    const rows = bodyRows(vud);
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText(rowName(27));
    await expect(rows.last()).toContainText(rowName(23));
    await expect(vud.getByRole('navigation', { name: 'Pagination' }).first()).toContainText(/1–5\s*\/\s*27/);
    await expect(vud.getByRole('button', { name: 'Page 1' }).first()).toHaveAttribute('aria-current', 'page');
    await vud.getByRole('button', { name: 'Next page' }).first().click();
    await expect(vud.getByRole('button', { name: 'Page 2' }).first()).toHaveAttribute('aria-current', 'page');
    await expect(vud.getByRole('navigation', { name: 'Pagination' }).first()).toContainText(/6–10\s*\/\s*27/);
    await expect(rows.first()).toContainText(rowName(22));
    await expect(rows.last()).toContainText(rowName(18));

    // A sort goes back to the first page and holds across pages.
    await pickSort(page, vud, 'Spend (ascending)');
    await expect(vud.getByRole('button', { name: 'Page 1' }).first()).toHaveAttribute('aria-current', 'page');
    // Ascending spend: 100 (row 7), 110 (row 11), 120 (row 15) …
    await expect(rows.nth(0)).toContainText(rowName(7));
    await expect(rows.nth(1)).toContainText(rowName(11));
    await expect(rows.nth(2)).toContainText(rowName(15));
    // … and the sort holds on the last page: 350 (row 26), 360 (row 3).
    await vud.getByRole('button', { name: 'Page 6' }).first().click();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(rowName(26));
    await expect(rows.nth(1)).toContainText(rowName(3));

    await pickSort(page, vud, 'Spend (descending)');
    await expect(vud.getByRole('button', { name: 'Page 1' }).first()).toHaveAttribute('aria-current', 'page');
    await expect(rows.first()).toContainText(rowName(3));
    await pickSort(page, vud, 'Default order');
    await expect(rows.first()).toContainText(rowName(27));

    // Previous period: its own count, rows and span.
    await vud.getByRole('tab', { name: 'Previous period' }).click();
    await expect(vud.getByText(/3 transactions make up this figure/)).toBeVisible({ timeout: 45_000 });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('VUD prev 3');
    await expect(rows.nth(2)).toContainText('VUD prev 1');

    // Back on this period, sorted by spend descending: the CSV holds every row in that order.
    await vud.getByRole('tab', { name: 'This period' }).click();
    await expect(vud.getByText(/27 transactions make up this figure/)).toBeVisible({ timeout: 45_000 });
    await pickSort(page, vud, 'Spend (descending)');
    await expect(rows.first()).toContainText(rowName(3));

    const [download] = await Promise.all([page.waitForEvent('download'), vud.getByRole('button', { name: 'Download CSV' }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const bytes = fs.readFileSync((await download.path())!);
    expect([...bytes.subarray(0, 3)], 'UTF-8 BOM').toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.subarray(3).toString('utf8').split('\r\n').filter((l) => l !== '');
    expect(lines[0]).toBe('Date,Description,Account,Category,Spend');
    expect(lines).toHaveLength(28);
    expect(lines[1]).toBe(`${ddmmyyyy(dayOf(seed.current, 3))},${rowName(3)},${seed.account.name},,360.00`);
    expect(lines[27]).toBe(`${ddmmyyyy(dayOf(seed.current, 7))},${rowName(7)},${seed.account.name},,100.00`);

    await vud.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a this-month KPI lists an empty month as such, and each period downloads its own CSV', async ({ page }) => {
    const report = await createReport(api, {
      name: 'VUD This Month',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'spend', aggregation: 'sum', filters: [{ field: 'date', operator: 'this_month' }] },
    } as never);
    const board = await dashboardWith(api, 'VUD Month Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    await widgetCard(page).getByRole('button', { name: /₹/ }).click({ timeout: 45_000 });
    const vud = dialogOf(page);
    await expect(vud.getByText(/No (rows|transactions)/i).first()).toBeVisible({ timeout: 45_000 });

    const [current] = await Promise.all([page.waitForEvent('download'), vud.getByRole('button', { name: 'Download CSV' }).click()]);
    expect(current.suggestedFilename()).toMatch(/\.csv$/);
    // No rows: only the header.
    const body = fs.readFileSync((await current.path())!).subarray(3).toString('utf8');
    expect(body).toBe('Date,Description,Account,Category,Spend\r\n');

    await vud.getByRole('tab', { name: 'Previous period' }).click();
    const [previous] = await Promise.all([page.waitForEvent('download'), vud.getByRole('button', { name: 'Download CSV' }).click()]);
    // Each period's file is named for its own span.
    expect(previous.suggestedFilename()).not.toBe(current.suggestedFilename());
  });

  test('a row opened from the underlying data and closed stays closed when the browser comes Back to it @mobile', async ({ page }) => {
    test.slow();
    const seed = await seedSpend(api, 3);
    const report = await spendKpi(api, 'VUD Back', seed);
    const board = await dashboardWith(api, 'VUD Back Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    await widgetCard(page).getByRole('button', { name: /₹/ }).click({ timeout: 45_000 });
    const vud = dialogOf(page);
    await expect(vud.getByText(/3 transactions make up this figure/)).toBeVisible({ timeout: 45_000 });
    await bodyRows(vud).filter({ hasText: rowName(2) }).click();

    // The row opens on Transactions with its detail; closing takes ?txn out of the address.
    const detail = page.getByRole('dialog', { name: rowName(2) });
    await expect(detail).toBeVisible({ timeout: 45_000 });
    await expect(page).toHaveURL(new RegExp(`txn=${seed.ids[rowName(2)]}`));
    await page.keyboard.press('Escape');
    await expect(detail).toHaveCount(0);
    await expect(page).not.toHaveURL(/txn=/);

    // Elsewhere through the router (a link, no reload), then Back: the detail must stay closed.
    const palette = page.getByRole('dialog', { name: 'Search' });
    const phone = (page.viewportSize()?.width ?? 1440) < 641;
    const trigger = phone
      ? page.getByRole('button', { name: 'Search', exact: true })
      : page.locator('nav.w-container-xs').getByRole('button', { name: /Search/ });
    await expect(async () => {
      await trigger.click();
      await expect(palette).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await page.getByRole('searchbox').fill('Accounts');
    await palette.getByRole('option').filter({ hasText: /^Accounts$/ }).click();
    await expect(page).toHaveURL(/\/accounts/);
    await page.goBack();
    await expect(page).toHaveURL(/\/transactions/);
    await expect(page).not.toHaveURL(/txn=/);
    await expect(page.getByText(rowName(2)).first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('net worth: one table per side headed by its total, what is not counted, and each row breaks down to its ledger', async ({ page }) => {
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

    await page.goto('/home');
    await page.getByTestId('net-worth-value').getByRole('button').first().click({ timeout: 45_000 });

    const vud = page.getByRole('dialog', { name: 'Underlying data · Net worth' });
    await expect(vud.getByText('3 rows make up this figure')).toBeVisible({ timeout: 45_000 });
    // One table per group (Assets, Liabilities, Investments); each heading carries the group's total.
    const assets = vud.getByRole('region', { name: 'Assets' });
    const liabilities = vud.getByRole('region', { name: 'Liabilities' });
    const investments = vud.getByRole('region', { name: 'Investments' });
    await expect(assets.getByRole('heading', { level: 3 })).toHaveText(/^Assets\s*₹11,300$/);
    await expect(liabilities.getByRole('heading', { level: 3 })).toHaveText(/^Liabilities\s*−₹500$/);
    await expect(investments.getByRole('heading', { level: 3 })).toHaveText(/^Investments\s*₹14,999\.90$/);
    await expect(assets.getByRole('button')).toHaveText([/NW Savings/]);
    await expect(liabilities.getByRole('button')).toHaveText([/NW Overdrawn/]);
    await expect(investments.getByRole('button')).toHaveText([/NW Broker/]);
    await expect(assets.getByRole('columnheader')).toHaveText(['Name', 'Kind', 'Net value']);
    // The kind reads as its label, never the stored value.
    await expect(assets.getByRole('button').first().getByRole('cell').nth(1)).toHaveText('Bank account');
    await expect(investments.getByRole('button').first().getByRole('cell').nth(1)).toHaveText('Broker');
    await expect(vud.getByText('bank_account')).toHaveCount(0);

    // What the total leaves out.
    // The server lists them in no set order, so each is checked on its own.
    await expect(vud).toContainText(/Excluded from this figure:/);
    await expect(vud).toContainText('NW Hidden (Excluded from net worth)');
    await expect(vud).toContainText(/NW Closed \(Closed on/);

    // A bank row: its ledger, its transactions, then Back to the list.
    await assets.getByRole('button').filter({ hasText: 'NW Savings' }).click();
    await expect(vud.getByText('Asset · Bank account')).toBeVisible();
    await expect(vud).toContainText(/Opening balance\s*₹10,000\s*\+\s*Credits \(1\)\s*₹2,500\s*−\s*Debits \(1\)\s*₹1,200\s*=\s*Balance\s*₹11,300/);
    const transactions = vud.getByRole('region', { name: 'Transactions' });
    await expect(bodyRows(transactions)).toHaveText([/NW rent/, /NW refund/]);
    // Inside a breakdown the CSV is the KPI's rows, not this ledger's.
    await expect(vud.getByRole('button', { name: 'Download CSV' })).toHaveCount(0);
    await vud.getByRole('button', { name: 'Back' }).click();
    await expect(assets.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(vud.getByRole('button', { name: 'Download CSV' })).toBeVisible();

    // A broker row: cash plus holdings; a holding opens its positions breakdown.
    await investments.getByRole('button').filter({ hasText: 'NW Broker' }).click();
    await expect(vud.getByText('Asset · Broker')).toBeVisible();
    await expect(vud).toContainText(/Cash balance\s*₹5,000\s*\+\s*Holdings at market value \(1\)\s*₹9,999\.90\s*=\s*Balance\s*₹14,999\.90/);
    await vud.getByRole('region', { name: 'Holdings' }).getByRole('button').filter({ hasText: stock.name }).click();
    await expect(vud).toContainText(/Cost of open lots\s*₹1,000\s*\+\s*Unrealised gain\s*₹8,999\.90\s*=\s*Current value\s*₹9,999\.90/);
    await expect(bodyRows(vud.getByRole('region', { name: 'Open lots' }))).toHaveCount(1);
    await vud.getByRole('button', { name: 'Back' }).click();
    await expect(vud.getByText('Asset · Broker')).toBeVisible();
    await vud.getByRole('button', { name: 'Back' }).click();

    // A user sort keeps the grouped tables, each total unchanged.
    await pickSort(page, vud, 'Net value (ascending)');
    await expect(assets.getByRole('button')).toHaveText([/NW Savings/]);
    await expect(liabilities.getByRole('button')).toHaveText([/NW Overdrawn/]);
    await expect(assets.getByRole('heading', { level: 3 })).toHaveText(/^Assets\s*₹11,300$/);

    // The file prints kind and group by their labels, in the sorted order (a user sort replaces the grouped order).
    const [download] = await Promise.all([page.waitForEvent('download'), vud.getByRole('button', { name: 'Download CSV' }).click()]);
    const csvBody = fs.readFileSync((await download.path())!).subarray(3).toString('utf8');
    expect(csvBody.split('\r\n').filter(Boolean)).toEqual([
      'Name,Kind,Group,Net value',
      'NW Overdrawn,Bank account,Liabilities,-500.00',
      'NW Savings,Bank account,Assets,11300.00',
      'NW Broker,Broker,Investments,14999.90',
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
    const card = widgetCard(page);
    const rows = bodyRows(card);
    // The saved order (description asc), 25 to a page.
    await expect(rows).toHaveCount(25, { timeout: 45_000 });
    await expect(rows.first()).toContainText(name(1));
    await expect(card.getByRole('button', { name: 'Page 1' }).first()).toHaveAttribute('aria-current', 'page');

    await card.getByRole('button', { name: 'Amount', exact: true }).click();
    await expect(rows.first()).toContainText(name(ascending[0]));
    await expect(rows.nth(24)).toContainText(name(ascending[24]));

    await card.getByRole('button', { name: 'Next page' }).first().click();
    await expect(card.getByRole('button', { name: 'Page 2' }).first()).toHaveAttribute('aria-current', 'page');
    await expect(rows.first()).toContainText(name(ascending[25]));

    // A new sort goes back to page one.
    await card.getByRole('button', { name: 'Amount', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Page 1' }).first()).toHaveAttribute('aria-current', 'page');
    await expect(rows.first()).toContainText(name(ascending[54]));

    // The sort is for this visit only: the report keeps its saved order.
    await page.reload();
    await expect(rows.first()).toContainText(name(1));
    const saved = await api.GET('/api/v1/reports/{id}', { params: { path: { id: report.id } } });
    expect((saved.data?.definition as { sort?: unknown }).sort).toEqual([{ key: 'description', direction: 'asc' }]);
  });

  test('@mobile on a phone the dialog is a sheet anchored to the bottom with the rows as cards; sort and the previous period work from it', async ({
    page,
    isMobile,
  }) => {
    const seed = await seedSpend(api, 3);
    const report = await spendKpi(api, 'VUD Phone', seed);
    const board = await dashboardWith(api, 'VUD Phone Board', [report.id]);

    await page.goto(`/dashboards/${board.id}`);
    await widgetCard(page).getByRole('button', { name: /₹/ }).click({ timeout: 45_000 });
    const vud = dialogOf(page);
    await expect(vud.getByText(/3 transactions make up this figure/)).toBeVisible({ timeout: 45_000 });

    // Phone: a sheet against the bottom edge, full width. Desktop: centred. Polled, so the open animation has settled.
    const viewport = page.viewportSize()!;
    const geometry = async () => {
      const box = (await vud.boundingBox())!;
      return isMobile
        ? { gapBelow: Math.round(viewport.height - (box.y + box.height)), gapLeft: Math.round(box.x), gapRight: Math.round(viewport.width - box.x - box.width) }
        : { centreOffset: Math.abs(Math.round(box.x + box.width / 2 - viewport.width / 2)) };
    };
    await expect.poll(geometry).toEqual(isMobile ? { gapBelow: 0, gapLeft: 0, gapRight: 0 } : { centreOffset: 0 });
    // The page itself never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const rows = bodyRows(vud);
    await expect(rows).toHaveCount(3);
    if (isMobile) {
      // Cards, not columns: the description titles each card, the spend is the figure, and the date and account make the line under it.
      await expect(vud.getByRole('columnheader')).toHaveCount(0);
      const card = rows.filter({ hasText: rowName(2) });
      await expect(card.getByRole('cell')).toHaveText([rowName(2), '₹290']);
      await expect(card).toContainText(`2 ${MONTHS[seed.current.month - 1]} · ${seed.account.name}`);
    }

    await pickSort(page, vud, 'Spend (ascending)');
    // Ascending spend: 220 (row 1), 290 (row 2), 360 (row 3).
    await expect(rows).toHaveText([new RegExp(rowName(1)), new RegExp(rowName(2)), new RegExp(rowName(3))]);
    await pickSort(page, vud, 'Default order');
    await expect(rows.first()).toContainText(rowName(3));

    await vud.getByRole('tab', { name: 'Previous period' }).click();
    await expect(vud.getByText(/3 transactions make up this figure/)).toBeVisible();
    await expect(rows.filter({ hasText: 'VUD prev 3' })).toContainText('₹400');

    await vud.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
