import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
  createBroker,
  resolveInstrument,
  trade,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Dividends UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dividends');
    await loginContext(context, currentUser.cookie);
  });

  test('Record dividend manually, Rescan and record all suggestions, hero figures', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    // Resolve RELIANCE.NS and buy on 2024-01-01 before stubbed dividend events
    const reliance = await resolveInstrument(userApi, {
      type: 'stock',
      name: 'Reliance Industries Limited',
      symbol: 'RELIANCE.NS',
      exchange: 'NSE',
      yahooSymbol: 'RELIANCE.NS',
    });

    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: reliance.id,
      type: 'buy',
      quantity: 50,
      price: 2000,
      tradeDate: '2024-01-01',
    });

    await page.goto('/investments/dividends');

    // 1. Record a payout by hand from the top-bar +.
    await page.getByRole('button', { name: 'Record dividend', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record dividend' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: /^Account/ }).click();
    await page.getByRole('option', { name: new RegExp(broker.name) }).first().click();
    await dialog.getByRole('combobox', { name: /^Instrument/ }).click();
    await page.getByRole('option', { name: /Reliance Industries/i }).first().click();
    await dialog.getByLabel(/^Amount/).fill('350');
    await dialog.getByRole('button', { name: 'Record dividend' }).click();
    await expectToast(page, 'Dividend recorded');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('350').locator('visible=true').first()).toBeVisible();

    // 2. Rescan finds the stubbed payouts; Record N records them all.
    const card = page.getByText(/^Suggestions/).first().locator('xpath=ancestor::div[contains(@class,"border")][1]');
    await card.getByRole('button', { name: 'Rescan' }).click();
    await expect(card.getByText(/^Checked \d+ symbols?/)).toBeVisible({ timeout: 30_000 });
    const acceptBtn = card.getByRole('button', { name: /^Record \d+$/ });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();
    await expectToast(page, /Recorded \d+ dividends?/);

    // 3. The hero figures follow the recorded payouts.
    await expect(page.getByText(/^Received/).locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('TDS', { exact: true }).locator('visible=true').first()).toBeVisible();
  });
});
