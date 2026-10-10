import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  refreshPrices,
  resolveInstrument,
  setManualPrice,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast, openInstruments, openInvestments } from '../fixtures/ui';

/** Click until the dialog it opens is visible (a click before hydration is dropped). */
async function openDialogWith(page: Page, click: () => Promise<void>, title: string | RegExp) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(async () => {
    if (!(await dialog.isVisible())) await click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  return dialog;
}

test.describe('Instrument edits per account UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-instrument-edits');
    await loginContext(context, currentUser.cookie);
  });

  test('rename an instrument for my account, see "Edited for your account", then reset to catalog', async ({ page }) => {
    const userApi = makeApi(currentUser.cookie);
    const symbol = generateYahooSymbol('UIE');
    const catalogName = `Catalog Name ${uniqueSeedSuffix()}`;
    await resolveInstrument(userApi, {
      type: 'stock',
      name: catalogName,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    await openInstruments(page);
    await page.getByPlaceholder('Search by ticker, name, ISIN...').filter({ visible: true }).fill(symbol);
    // The search runs on the server (debounced): wait until the list is down to the one match.
    await expect(page.getByRole('button', { name: 'Edit Instrument' }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText(catalogName, { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText('Edited for your account').filter({ visible: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reset to catalog' }).filter({ visible: true })).toHaveCount(0);

    const dialog = await openDialogWith(
      page,
      () => page.getByRole('button', { name: 'Edit Instrument' }).filter({ visible: true }).first().click(),
      'Edit Instrument'
    );
    await expect(dialog.getByText(/Edits apply to your account only/)).toBeVisible();
    // The form stops at the server's limits.
    await expect(dialog.getByLabel('Exchange')).toHaveAttribute('maxlength', '20');

    const myName = `My Name ${uniqueSeedSuffix()}`;
    await dialog.getByLabel('Instrument Name').fill(myName);
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expectToast(page, `Updated ${myName} for your account`);
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(myName, { exact: true }).filter({ visible: true })).toHaveCount(1);
    const badge = page.getByText('Edited for your account', { exact: false }).filter({ visible: true });
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveAttribute('title', 'Edited for your account: name');

    const confirm = await openDialogWith(
      page,
      () => page.getByRole('button', { name: 'Reset to catalog' }).filter({ visible: true }).first().click(),
      'Reset to catalog?'
    );
    await confirm.getByRole('button', { name: 'Reset to catalog' }).click();
    await expectToast(page, `${catalogName} reset to catalog`);

    await expect(page.getByText(catalogName, { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText(myName, { exact: true })).toHaveCount(0);
    await expect(page.getByText('Edited for your account').filter({ visible: true })).toHaveCount(0);
  });

  test('identifier edits: clearing one is blocked inline; changing only the Yahoo symbol moves my holding', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const symbol = generateYahooSymbol('UIY');
    const name = `Yahoo Only ${uniqueSeedSuffix()}`;
    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });
    const broker = await createBroker(userApi);
    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 3,
      price: 100,
      tradeDate: '2026-08-01',
    });

    await openInstruments(page);
    await page.getByPlaceholder('Search by ticker, name, ISIN...').filter({ visible: true }).fill(symbol);
    // The search runs on the server (debounced): wait until the list is down to the one match.
    await expect(page.getByRole('button', { name: 'Edit Instrument' }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toHaveCount(1);
    const dialog = await openDialogWith(
      page,
      () => page.getByRole('button', { name: 'Edit Instrument' }).filter({ visible: true }).first().click(),
      'Edit Instrument'
    );

    // Clearing the Yahoo symbol with no other new identifier never reaches the server.
    const yahoo = dialog.getByLabel('Yahoo Symbol (For Stocks/ETFs)');
    await yahoo.fill('');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog.getByText(/Yahoo symbol can't be cleared for your account alone/)).toBeVisible();
    await expect(yahoo).toHaveAttribute('aria-invalid', 'true');

    // A new Yahoo symbol alone (ISIN unchanged) is enough to move the holding.
    const newYahoo = generateYahooSymbol('UIY2');
    await yahoo.fill(newYahoo);
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expectToast(page, `Moved your holdings to ${name}`);
    await expect(dialog).not.toBeVisible();

    const pos = await userApi.GET('/api/v1/investments/positions');
    const moved = pos.data!.positions.find((p) => p.brokerAccountId === broker.id);
    expect(moved?.instrument.id).not.toBe(inst.id);
    const target = await userApi.GET('/api/v1/instruments/{id}', { params: { path: { id: moved!.instrument.id } } });
    expect(target.data!.yahooSymbol).toBe(newYahoo);
  });

  test('price history: edit and delete only on my own manual prices', async ({ page, request }) => {
    const userApi = makeApi(currentUser.cookie);
    const other = await createUser(request, 'ui-instrument-edits-other');
    const otherApi = makeApi(other.cookie);

    const symbol = generateYahooSymbol('UIP');
    const name = `Price Rows ${uniqueSeedSuffix()}`;
    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });
    const broker = await createBroker(userApi);
    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 4,
      price: 300,
      tradeDate: '2026-08-01',
    });
    // A feed (Yahoo stub) price today, my manual price yesterday, another user's manual price before that.
    await refreshPrices(userApi, inst.id);
    await setManualPrice(userApi, inst.id, { price: 321.5, asOf: istToday(-1) });
    await setManualPrice(otherApi, inst.id, { price: 654.25, asOf: istToday(-2) });

    await openInvestments(page);
    const dialog = await openDialogWith(
      page,
      () => page.getByText(name, { exact: true }).filter({ visible: true }).first().click(),
      new RegExp(name)
    );

    await expect(dialog.getByText(/Price History Log/)).toBeVisible();
    // The feed row is shown without actions; my row has both; the other user's price is not shown at all.
    await expect(dialog.getByTitle('Auto-fetched price — refreshes from Yahoo Finance')).toBeVisible();
    await expect(dialog.getByText(/321\.50/)).toBeVisible();
    await expect(dialog.getByText(/654\.25/)).toHaveCount(0);
    await expect(dialog.getByTitle('Edit manual price')).toHaveCount(1);
    await expect(dialog.getByTitle('Delete manual price')).toHaveCount(1);

    await dialog.getByTitle('Delete manual price').click();
    await expectToast(page, 'Price entry deleted');
    await expect(dialog.getByText(/321\.50/)).toHaveCount(0);
    await expect(dialog.getByTitle('Edit manual price')).toHaveCount(0);
    await expect(dialog.getByTitle('Auto-fetched price — refreshes from Yahoo Finance')).toBeVisible();
  });
});
