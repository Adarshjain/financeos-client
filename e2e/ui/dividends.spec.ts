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
import { expectToast, openDividends } from '../fixtures/ui';

test.describe('Dividends UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dividends');
    await loginContext(context, currentUser.cookie);
  });

  test('Record dividend manually, detect and accept suggestions, verify Auto badge and summary strip', async ({
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

    await openDividends(page);

    // 1. Record Dividend / Income manually
    await page.getByRole('button', { name: /Record Dividend \/ Income/i }).click();
    await expect(page.getByRole('heading', { name: 'Record Income / Dividend' })).toBeVisible();

    // Select held instrument
    const instSelect = page.getByRole('combobox').nth(1);
    await instSelect.click();
    await page.getByRole('option', { name: /Reliance Industries/i }).click();

    // Fill Amount
    await page.getByPlaceholder('0.00').first().fill('350');
    await page.getByRole('button', { name: /Record Payout/i }).click();

    await expectToast(page, /Recorded dividend payout/i);
    await expect(page.getByText('₹350').first()).toBeVisible();

    // 2. Detect Dividends via suggestions dialog
    await page.getByRole('button', { name: /Detect Dividends/i }).click();
    await expect(page.getByRole('heading', { name: 'Auto-Detect Dividends' })).toBeVisible();

    // Dialog will scan and display suggestions
    await expect(page.getByText(/Checked 1 symbol|Found \d+ dividend/i)).toBeVisible({ timeout: 10000 });

    // Accept suggestions
    const acceptBtn = page.getByRole('button', { name: /Record \d+ Dividend/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    await expectToast(page, /Recorded \d+ dividend/i);

    // 3. Verify Auto badge appears for the suggested dividends
    await expect(page.getByText('Auto').and(page.locator(':visible')).first()).toBeVisible();

    // 4. Verify summary strip cards
    await expect(page.getByText('Gross Income').and(page.locator(':visible')).first()).toBeVisible();
    await expect(page.getByText('Net Received').and(page.locator(':visible')).first()).toBeVisible();
  });
});
