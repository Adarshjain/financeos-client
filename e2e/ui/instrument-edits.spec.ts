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
import { expectToast } from '../fixtures/ui';

/** Click until the dialog it opens is visible (a click before hydration is dropped). */
async function openDialogWith(page: Page, click: () => Promise<void>, title: string | RegExp) {
  const dialog = page.getByRole('dialog', { name: title });
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

    await page.goto(`/investments/instruments?q=${symbol}`);
    // The search runs on the server: wait until the list is down to the one match.
    await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toHaveCount(1);
    const dialog = await openDialogWith(
      page,
      () => page.getByText(name, { exact: true }).filter({ visible: true }).first().click(),
      'Edit instrument'
    );

    // Clearing the Yahoo symbol with no other new identifier never reaches the server.
    const yahoo = dialog.getByLabel('Yahoo symbol');
    await yahoo.fill('');
    await dialog.getByRole('button', { name: 'Save instrument' }).click();
    await expect(dialog.getByText(/Yahoo symbol can't be cleared for your account alone/)).toBeVisible();
    await expect(yahoo).toHaveAttribute('aria-invalid', 'true');

    // A new Yahoo symbol alone (ISIN unchanged) is enough to move the holding.
    const newYahoo = generateYahooSymbol('UIY2');
    await yahoo.fill(newYahoo);
    await dialog.getByRole('button', { name: 'Save instrument' }).click();
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

    await page.goto(`/investments/${inst.id}`);
    await page.getByRole('button', { name: 'Price history' }).click();
    const dialog = page.getByRole('dialog', { name: 'Price history' });

    // The feed row is shown without actions; my row has both; the other user's price is not shown at all.
    await expect(dialog.getByText(/321\.50/)).toBeVisible();
    await expect(dialog.getByText(/654\.25/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Edit' })).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: 'Delete' })).toHaveCount(1);
    const feedRows = await dialog.getByText(/^\d{1,2} \w{3}/).count();
    expect(feedRows).toBeGreaterThanOrEqual(2);

    await dialog.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete manual price' }).getByRole('button', { name: 'Delete' }).click();
    await expectToast(page, 'Price deleted');
    await expect(dialog.getByText(/321\.50/)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });
  test('exchange switch: picking BSE in the Exchange dropdown moves my holding to the BSE listing', async ({ page }) => {
    const userApi = makeApi(currentUser.cookie);
    const ticker = `UIX${uniqueSeedSuffix()}`;
    const symbol = ticker;
    const name = `Exchange Switch ${uniqueSeedSuffix()}`;
    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: `${ticker}.NS`,
    });
    const broker = await createBroker(userApi);
    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 2,
      price: 100,
      tradeDate: '2026-08-01',
    });

    await page.goto(`/investments/instruments?q=${symbol}`);
    await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toHaveCount(1);
    const dialog = await openDialogWith(
      page,
      () => page.getByText(name, { exact: true }).filter({ visible: true }).first().click(),
      'Edit instrument'
    );
    await dialog.getByRole('combobox', { name: 'Exchange' }).click();
    await page.getByRole('option', { name: 'BSE' }).click();
    await expect(dialog.getByLabel('Yahoo symbol')).toBeDisabled();
    await dialog.getByRole('button', { name: 'Save instrument' }).click();
    await expectToast(page, `Moved your holdings to ${name}`);
    await expect(dialog).not.toBeVisible();

    const pos = await userApi.GET('/api/v1/investments/positions');
    const moved = pos.data!.positions.find((p) => p.brokerAccountId === broker.id);
    expect(moved?.instrument.id).not.toBe(inst.id);
    await page.goto(`/investments/${moved!.instrument.id}`);
    await expect(page.getByText(/BSE/).filter({ visible: true }).first()).toBeVisible();
  });
});
