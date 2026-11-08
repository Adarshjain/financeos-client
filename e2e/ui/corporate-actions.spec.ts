import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Corporate Actions UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-corporate-actions');
    await loginContext(context, currentUser.cookie);
  });

  test('Record a split from the Dinero dialog and see it listed', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);
    const sym = generateYahooSymbol('UICA');
    const isin = generateIsin();

    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name: `UI CA Test Stock ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    await page.goto('/investments/corporate-actions');

    // 1. The top-bar + opens the record dialog.
    await page.getByRole('button', { name: 'Record corporate action', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record corporate action' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Instrument/ }).click();
    await page.getByPlaceholder('Search by name or symbol').fill(sym);
    await page.getByRole('option', { name: new RegExp(sym) }).first().click();

    await dialog.getByRole('combobox', { name: /^Action/ }).click();
    await page.getByRole('option', { name: 'Stock split' }).click();

    await dialog.getByRole('textbox', { name: /^Before/ }).fill('1');
    await dialog.getByRole('textbox', { name: /^After/ }).fill('2');
    await dialog.getByLabel('Ex-date').fill('01/06/2026');
    await expect(dialog.getByText('After saving')).toBeVisible();

    await dialog.getByRole('button', { name: 'Record split' }).click();
    await expectToast(page, 'Corporate action recorded');
    await expect(dialog).toHaveCount(0);

    // 2. The recorded action is listed with its ratio. Editing, the demerger fields and delete have their own
    // coverage in ds-investments-corporate-actions.spec.ts.
    await expect(page.getByText(inst.name, { exact: false }).locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('Split', { exact: true }).locator('visible=true').first()).toBeVisible();
    await expect(page.getByText(/1 → 2|1 : 2|1:2/).locator('visible=true').first()).toBeVisible();
  });

});
