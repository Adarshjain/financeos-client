import type { ApiClient as Api } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
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
import { expectToast } from '../fixtures/ui';

/** Mirrors the client's formatDate in a list ("10 Mar"). */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

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

const narr = (name: string) => `ACH C- ${name} DIVIDEND`;

test.describe('Dividend receipt reconciliation UI (@ui)', () => {
  let currentUser: CreatedUser;
  let api: Api;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-div-receipts');
    api = makeApi(currentUser.cookie);
    await loginContext(context, currentUser.cookie);
  });

  // The receipt words, filters, Reconcile, the edit dialog's receipt section and the instrument link are covered in
  // ds-investments-dividends.spec.ts. What follows is not.

  test('Reconcile dialog: the caption names the unmatched count and how far the bank data reaches', async ({ page }) => {
    const bank = await createBankAccount(api, { name: 'Receipts Bank' });
    // Coverage ends at today-5, so the old dividend's payout window has closed with bank data covering it.
    await createTransaction(api, bank.id, { amount: 50, date: todayString(-5), description: 'Misc credit' });
    const old = await seedHolding(api);
    await dividend(api, old, 1000, -40);
    // A dividend-like credit nobody recorded is what puts the Reconcile banner on the page.
    await createTransaction(api, bank.id, { amount: 500, date: todayString(-5), description: narr(old.name) });

    await page.goto('/investments/dividends');
    await page.getByRole('button', { name: 'Reconcile', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Find matches' }).click();
    await expect(
      dialog.getByText(`1 unmatched dividend · 0 with candidates · Bank data through ${fmtDate(todayString(-5))}`)
    ).toBeVisible();
  });

  test('transactions: Dividend word on the credit, detail Unlink removes it, Link to… -> Dividend re-links', async ({
    page,
  }) => {
    const bank = await createBankAccount(api, { name: 'Txn Side Bank' });
    const h = await seedHolding(api);
    const div = await dividend(api, h, 1000, -10);
    const desc = `Txn Side Dividend Credit ${Date.now()}`;
    const credit = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-10), description: desc });
    await linkDividendTransaction(api, div.id, credit.id);

    const word = page.getByText(`Dividend · ${h.symbol}`).locator('visible=true');

    await page.goto(`/transactions?q=${encodeURIComponent(desc)}`);
    await expect(page.getByText(desc).locator('visible=true').first()).toBeVisible();
    await expect(word.first()).toBeVisible();

    // Detail: the dividend is listed under its links, then Unlink.
    await page.getByText(desc).locator('visible=true').first().click();
    const detail = page.getByRole('dialog', { name: desc });
    await expect(detail.getByText(`Dividend · ${h.symbol}`)).toBeVisible();
    await detail.getByRole('button', { name: 'Unlink' }).click();
    await expectToast(page, 'Dividend unlinked');
    await expect(detail.getByText(`Dividend · ${h.symbol}`)).toHaveCount(0);

    // Link to… -> Dividend -> pick the declared dividend.
    await detail.getByRole('button', { name: 'Link to…' }).click();
    const link = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: 'Type' }) });
    await link.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Dividend', exact: true }).click();
    await link.getByRole('radio', { name: new RegExp(h.symbol) }).click();
    await link.getByRole('button', { name: 'Link dividend' }).click();
    await expect(link).toHaveCount(0);
    await expect(detail.getByText(`Dividend · ${h.symbol}`)).toBeVisible({ timeout: 30_000 });

    const linked = (await listDividends(api)).find((d) => d.id === div.id)!;
    expect(linked.transaction?.id).toBe(credit.id);
  });
});
