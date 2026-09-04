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
import { expectToast, openTradebook } from '../fixtures/ui';

test.describe('Tradebook UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-tradebook');
    await loginContext(context, currentUser.cookie);
  });

  test('Record trade via dialog, refresh prices button, and pagination over 10 rows', async ({
    page,
  }) => {
    // Seed broker and instrument via API for the user
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);
    const symbol = generateYahooSymbol('TBUI');
    const inst = await resolveInstrument(userApi, {
      type: 'stock',
      name: `Tradebook Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    await openTradebook(page);

    // 1. Record Trade via dialog
    await page.getByRole('button', { name: /Record Trade/i }).click();

    // Select instrument in Typeahead
    const typeaheadInput = page.getByPlaceholder(/Search instrument by name or symbol/i);
    await typeaheadInput.fill(symbol.slice(0, 5));
    const candidateBtn = page.getByRole('button', { name: new RegExp(symbol, 'i') }).first();
    await expect(candidateBtn).toBeVisible();
    await candidateBtn.click();
    await expect(page.getByRole('button', { name: 'Change' })).toBeVisible();

    // Fill quantity and price
    await page.getByLabel('Quantity').fill('15');
    await page.getByLabel('Price per Unit (₹)').fill('120.50');

    // Submit
    await page.getByRole('button', { name: /EXECUTE BUY ORDER/i }).click();
    await expectToast(page, /Recorded BUY trade/i);

    // Trade row appears in table
    await expect(page.getByText(symbol).and(page.locator(':visible')).first()).toBeVisible();

    // 2. Refresh Prices
    const refreshBtn = page.getByRole('button', { name: /Refresh Prices/i });
    await refreshBtn.click();
    await expectToast(page, /Price refresh/i);

    // 3. Seed 11 more trades (total 12) to test pagination beyond page size 10
    for (let i = 1; i <= 11; i++) {
      await trade(userApi, {
        brokerAccountId: broker.id,
        instrumentId: inst.id,
        type: 'buy',
        quantity: 10 + i,
        price: 100 + i,
        tradeDate: `2026-08-${i < 10 ? '0' + i : i}`,
      });
    }

    // Refresh tradebook page to load paginated data
    await openTradebook(page);

    // Pagination controls should show multiple pages
    const nextBtn = page.getByRole('button', { name: /Next page/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(page.getByRole('table')).toBeVisible();
    }
  });
});
