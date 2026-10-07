import type { Page } from '@playwright/test';

import type { ApiClient as Api } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { E2E_CLIENT_URL } from '../fixtures/config';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  createDividend,
  generateIsin,
  generateYahooSymbol,
  linkDividendTransaction,
  listDividends,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast, openDividends, openTransactions } from '../fixtures/ui';

/** Mirrors the client's formatDate ("10 Mar 26"). */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

/** ISO -> dd/mm/yyyy, the DateInput's display format. */
function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const narr = (name: string) => `ACH C- ${name} DIVIDEND`;

/** A broker + a uniquely named instrument + a buy, ready to receive dividends. */
async function seedHolding(api: Api, broker?: { id: string; name: string }) {
  const b = broker ?? (await createBroker(api));
  const symbol = `RC${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
  const name = `Zorvex${uniqueSeedSuffix()} Industries`;
  const inst = await resolveInstrument(api, {
    type: 'stock',
    name,
    isin: generateIsin(),
    symbol,
    exchange: 'NSE',
    yahooSymbol: generateYahooSymbol('RCP'),
  });
  await trade(api, {
    brokerAccountId: b.id,
    instrumentId: inst.id,
    type: 'buy',
    quantity: 100,
    price: 50,
    tradeDate: todayString(-400),
  });
  return { broker: b, inst, name, symbol };
}

async function dividend(
  api: Api,
  h: { broker: { id: string }; inst: { id: string } },
  amount: number,
  payOffset: number
) {
  return createDividend(api, {
    brokerAccountId: h.broker.id,
    instrumentId: h.inst.id,
    type: 'dividend',
    amount,
    payDate: todayString(payOffset),
  });
}

const rowOf = (page: Page, symbol: string) => page.locator('tr').filter({ hasText: symbol });

test.describe('Dividend receipt reconciliation UI (@ui)', () => {
  let currentUser: CreatedUser;
  let api: Api;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-div-receipts');
    api = makeApi(currentUser.cookie);
    await loginContext(context, currentUser.cookie);
  });

  test('page: receipt badges, receipt filter, summary tiles + coverage caption, instrument deep link chip', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Receipts Bank' });
    // Coverage ends at today-5, so the old dividend's payout window has closed with bank data covering it.
    await createTransaction(api, bank.id, { amount: 50, date: todayString(-5), description: 'Misc credit' });
    const broker = await createBroker(api);
    const fresh = await seedHolding(api, broker);
    const old = await seedHolding(api, broker);
    await dividend(api, fresh, 1000, 0); // awaiting
    await dividend(api, old, 1000, -40); // overdue

    await openDividends(page);
    await expect(rowOf(page, fresh.symbol).getByText('Awaiting', { exact: true })).toBeVisible();
    await expect(rowOf(page, old.symbol).getByText('Overdue', { exact: true })).toBeVisible();

    // Summary tiles and the coverage caption.
    const tiles = page.getByTestId('receipt-summary');
    await expect(tiles).toContainText(/Awaiting\s*1\b/);
    await expect(tiles).toContainText(/Overdue\s*1\b/);
    await expect(tiles).toContainText(/Received\s*0\b/);
    await expect(tiles).toContainText(`Bank data through ${fmtDate(todayString(-5))}`);

    // Receipt filter: Overdue narrows to the old row, Received is empty.
    const filter = page.getByRole('combobox', { name: 'Receipt status' });
    await filter.click();
    await page.getByRole('option', { name: 'Overdue', exact: true }).click();
    await expect(rowOf(page, old.symbol)).toBeVisible();
    await expect(rowOf(page, fresh.symbol)).toHaveCount(0);

    await filter.click();
    await page.getByRole('option', { name: 'Received', exact: true }).click();
    await expect(page.getByText('No dividends recorded yet.').filter({ visible: true })).toBeVisible();
    await expect(page.locator('tr').filter({ hasText: old.symbol })).toHaveCount(0);

    // ?instrumentId= deep link shows the chip; the x clears it.
    await page.goto(`${E2E_CLIENT_URL}/investments/dividends?instrumentId=${fresh.inst.id}`);
    await expect(page.getByRole('heading', { name: /Dividend Income & Payouts/i, level: 1 })).toBeVisible();
    const chip = page.getByRole('button', { name: 'Clear instrument filter' });
    await expect(chip).toContainText(`Showing ${fresh.symbol}`);
    await expect(rowOf(page, fresh.symbol)).toBeVisible();
    await expect(rowOf(page, old.symbol)).toHaveCount(0);

    await chip.click();
    await expect(chip).toHaveCount(0);
    await expect(page).not.toHaveURL(/instrumentId=/);
    await expect(rowOf(page, old.symbol)).toBeVisible();
    await expect(rowOf(page, fresh.symbol)).toBeVisible();
  });

  test('Reconcile panel: Find matches shows candidate, reason chips and pre-checked TDS; Confirm links it', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Recon Bank' });
    const h = await seedHolding(api);
    const div = await dividend(api, h, 1000, -10);
    await createTransaction(api, bank.id, {
      amount: 900,
      date: todayString(-10),
      description: narr(h.name),
    });

    await openDividends(page);
    await expect(rowOf(page, h.symbol).getByText('Awaiting', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Reconcile', exact: true }).click();
    await page.getByRole('button', { name: 'Find matches' }).click();

    const panel = page
      .getByText('Receipt matching', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await expect(panel.getByText(narr(h.name))).toBeVisible();
    await expect(panel.getByText('Net of TDS', { exact: true })).toBeVisible();
    await expect(panel.getByText('Net of 10% TDS', { exact: true })).toBeVisible();
    await expect(panel.getByText('Names the company', { exact: true })).toBeVisible();
    await expect(panel.getByText('Says dividend', { exact: true })).toBeVisible();
    const tdsBox = panel.getByRole('checkbox', { name: /Record TDS/ });
    await expect(tdsBox).toBeChecked();
    await expect(panel.getByText(/Record TDS ₹100\.00/)).toBeVisible();

    await panel.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expectToast(page, 'Linked 1 of 1');

    // The reconciliation row is gone and the table row is Received with the received line.
    await expect(panel.getByText(narr(h.name))).toHaveCount(0);
    await expect(panel.getByText(/No bank credits match your unmatched dividends/)).toBeVisible();
    const row = rowOf(page, h.symbol);
    await expect(row.getByText('Received', { exact: true })).toBeVisible();
    await expect(row).toContainText(`+₹900.00 · Recon Bank · ${fmtDate(todayString(-10))}`);

    // The implied TDS was written back.
    const saved = (await listDividends(api)).find((d) => d.id === div.id)!;
    expect(Number(saved.tds)).toBe(100);
  });

  test('Edit dialog receipt section: chip, TDS hint, Remove, receipt notes, note select locked while linked', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Edit Bank' });
    const h = await seedHolding(api);
    const div = await dividend(api, h, 1000, -10);
    const desc = narr(h.name);
    const credit = await createTransaction(api, bank.id, { amount: 900, date: todayString(-10), description: desc });
    await linkDividendTransaction(api, div.id, credit.id);

    await openDividends(page);
    const row = rowOf(page, h.symbol);
    await expect(row.getByText('Received', { exact: true })).toBeVisible();
    await row.getByRole('button').last().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Edit Payout/ })).toBeVisible();
    // Linked: badge, chip with Change/Remove, locked note select.
    await expect(dialog.getByText('Received', { exact: true })).toBeVisible();
    await expect(dialog.getByText(desc)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Change', exact: true })).toBeVisible();
    const noteSelect = dialog.getByRole('combobox').last();
    await expect(noteSelect).toBeDisabled();
    await expect(dialog.getByText('Unlink to change')).toBeVisible();

    // The credit is 100 short of gross and TDS is empty: the hint fills the TDS field.
    await dialog.getByRole('button', { name: /Use ₹100\.00 as TDS/ }).click();
    await expect(dialog.locator('input[name="tds"]')).toHaveValue('100');

    // Remove unlinks: toast, badge back to Awaiting, search list replaces the chip.
    await dialog.getByRole('button', { name: 'Remove' }).click();
    await expectToast(page, 'Unlinked');
    await expect(dialog.getByText('Awaiting', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Remove' })).toHaveCount(0);
    await expect(dialog.getByText('Unlink to change')).toHaveCount(0);
    await expect(noteSelect).toBeEnabled();

    // Receipt note: Not received, then back to derived.
    await noteSelect.click();
    await page.getByRole('option', { name: 'Not received (chasing)' }).click();
    await expectToast(page, 'Receipt note updated');
    await expect(dialog.getByText('Not received', { exact: true })).toBeVisible();

    await noteSelect.click();
    await page.getByRole('option', { name: 'Derived automatically' }).click();
    await expect(dialog.getByText('Awaiting', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Not received', { exact: true })).toHaveCount(0);
  });

  test('transactions: Dividend badge on the credit, detail Unlink removes it, Link… -> Dividend received re-links', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Txn Side Bank' });
    const h = await seedHolding(api);
    const div = await dividend(api, h, 1000, -10);
    const desc = `Txn Side Dividend Credit ${Date.now()}`;
    const credit = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-10), description: desc });
    await linkDividendTransaction(api, div.id, credit.id);

    const badge = page.locator('main').getByText(`Dividend · ${h.symbol}`);

    await openTransactions(page);
    await expect(page.locator('main').getByText(desc)).toBeVisible();
    await expect(badge).toBeVisible();

    // Detail: Links section group, then Unlink.
    await page.locator('main').getByText(desc).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Ledger, loans & dividends')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Open' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Unlink' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(badge).toHaveCount(0);

    // Link… -> Dividend received -> pick the existing dividend.
    await page.locator('main').getByText(desc).click();
    await page.getByRole('button', { name: /Link to/ }).click();
    await page.getByRole('dialog').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Dividend received', exact: true }).click();
    await page.getByRole('radio', { name: new RegExp(h.symbol) }).click();
    await page.getByRole('button', { name: 'Link dividend' }).click();
    await expectToast(page, 'Dividend linked');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(badge).toBeVisible();

    const linked = (await listDividends(api)).find((d) => d.id === div.id)!;
    expect(linked.transaction?.id).toBe(credit.id);
  });

  test('unrecorded credits: scan, Record for <symbol> opens a prefilled dialog, Record Payout records and links', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Unrecorded Bank' });
    const h = await seedHolding(api);
    const creditDate = todayString(-3);
    const desc = narr(h.name);
    await createTransaction(api, bank.id, { amount: 500, date: creditDate, description: desc });

    await openDividends(page);
    await page.getByRole('button', { name: 'Reconcile', exact: true }).click();
    await page.getByRole('button', { name: 'Scan bank credits' }).click();

    const record = page.getByRole('button', { name: `Record for ${h.symbol} · ${h.broker.name}` });
    await expect(page.getByText(desc)).toBeVisible();
    await record.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Record Dividend / Payout' })).toBeVisible();
    await expect(dialog.getByPlaceholder('0.00').first()).toHaveValue('500');
    await expect(dialog.getByLabel('Payment Date')).toHaveValue(ddmmyyyy(creditDate));

    await dialog.getByRole('button', { name: 'Record Payout' }).click();
    await expectToast(page, 'Dividend recorded and linked');

    // The credit is gone from the scan and the new dividend row is Received.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(record).toHaveCount(0);
    await expect(page.getByText('No unrecorded dividend-like credits in the last year.')).toBeVisible();
    const row = rowOf(page, h.symbol);
    await expect(row.getByText('Received', { exact: true })).toBeVisible();
    await expect(row).toContainText(`+₹500.00 · Unrecorded Bank · ${fmtDate(creditDate)}`);
  });

  test('mobile: card shows the Receipt badge and the receipt filter is in the page action bar (@mobile)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'ui-mobile', 'card layout + action bar only exist on the mobile viewport');
    const bank = await createBankAccount(api, { name: 'Mobile Bank' });
    await createTransaction(api, bank.id, { amount: 50, date: todayString(-5), description: 'Misc credit' });
    const h = await seedHolding(api);
    await dividend(api, h, 1000, -40); // overdue

    await openDividends(page);
    const card = page
      .getByText(h.symbol, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"shadow-sm")][1]');
    await expect(card.getByText('Receipt', { exact: true })).toBeVisible();
    await expect(card.getByText('Overdue', { exact: true })).toBeVisible();

    const filter = page.getByRole('combobox', { name: 'Receipt status' });
    await expect(filter).toBeVisible();
    await filter.click();
    await page.getByRole('option', { name: 'Received', exact: true }).click();
    await expect(page.getByText('No dividends recorded yet.').filter({ visible: true })).toBeVisible();
  });
});
