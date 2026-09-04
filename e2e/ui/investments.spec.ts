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
import { openInvestments } from '../fixtures/ui';

test.describe('Investments UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-investments');
    await loginContext(context, currentUser.cookie);
  });

  test('Portfolio holdings view: cards, badges, LTP, search filtering (@mobile)', async ({
    page,
  }) => {
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    // 1. Regular stock instrument with LTP 999.99
    const sym1 = generateYahooSymbol('HLD1');
    const name1 = `Holding Stock 1 ${uniqueSeedSuffix()}`;
    const inst1 = await resolveInstrument(userApi, {
      type: 'stock',
      name: name1,
      isin: generateIsin(),
      symbol: sym1,
      exchange: 'NSE',
      yahooSymbol: sym1,
    });

    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst1.id,
      type: 'buy',
      quantity: 25,
      price: 200,
      tradeDate: '2026-08-01',
    });

    // 2. Instrument with no Yahoo symbol -> manual price only
    const name2 = `No Symbol Holding ${uniqueSeedSuffix()}`;
    const inst2 = await resolveInstrument(userApi, {
      type: 'stock',
      name: name2,
      isin: generateIsin(),
    });

    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: inst2.id,
      type: 'buy',
      quantity: 10,
      price: 500,
      tradeDate: '2026-08-01',
    });

    await openInvestments(page);

    // Verify summary & holdings cards render
    await expect(page.getByRole('heading', { name: /Portfolio Holdings/i })).toBeVisible();

    // Verify Holding 1
    const card1 = page.locator(`text=${sym1}`).first();
    await expect(card1).toBeVisible();
    await expect(page.getByText('Qty. 25').first()).toBeVisible();

    // Verify Holding 2 has "manual price only" badge
    const card2 = page.locator(`text=${name2}`).first();
    await expect(card2).toBeVisible();
    await expect(page.getByText('manual price only').first()).toBeVisible();

    // Search filter
    const searchInput = page.locator('input[placeholder="Search holdings by symbol or name..."]:visible');
    await searchInput.fill(sym1);
    await expect(page.getByText(sym1).first()).toBeVisible();
    await expect(page.getByText(name2)).not.toBeVisible();

    // Clear search
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByText(name2).first()).toBeVisible();
  });
});
