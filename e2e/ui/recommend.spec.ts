import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
  createRewardCard,
  createRule,
  fixedMonth,
  spend,
} from '../fixtures/seed/rewards';
import { expect, test } from '../fixtures/test';

test.describe('Reward Recommendations / Card Picker UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-recommend');
    await loginContext(context, currentUser.cookie);
  });

  test('simulate spend, rank cards, verify Best badge, cap breakdown and bare card notice', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const month = fixedMonth();

    // 1. Seed Card A: 5% capped at ₹20, with prior spend earning ₹5
    const { account: cardA } = await createRewardCard(api, {
      name: 'UI Card A Capped',
    });
    await createRule(api, cardA.id, {
      name: '5% Capped ₹20',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 20,
      capWindow: 'CALENDAR_MONTH',
    });
    await spend(api, cardA.id, {
      amount: 100, // 5% of 100 = ₹5 earned
      date: `${month.from.slice(0, 7)}-05`,
    });

    // 2. Seed Card B: 1.5% Flat
    const { account: cardB } = await createRewardCard(api, {
      name: 'UI Card B Flat',
    });
    await createRule(api, cardB.id, {
      name: '1.5% Flat Rate',
      accrualType: 'PERCENT',
      percentRate: 1.5,
    });

    // 3. Seed Card C: Bare card (no rules)
    const { account: cardC } = await createRewardCard(api, {
      name: 'UI Card C Bare',
    });

    // Navigate to /rewards/recommend
    await page.goto('/rewards/recommend');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Card Picker', exact: true })).toBeVisible();

    // Fill Amount ₹1000
    const amountInput = page.getByLabel('Amount (₹) *');
    await amountInput.fill('1000');

    // Click "Rank cards" button
    await page.getByRole('button', { name: 'Rank cards' }).click();

    // Verify Results
    // 1. Best badge appears
    await expect(page.getByText('Best')).toBeVisible();

    // 2. Flat card and capped card appear
    await expect(page.getByRole('heading', { name: 'UI Card B Flat' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'UI Card A Capped' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'UI Card C Bare' })).toBeVisible();

    // 3. Bare card notice
    await expect(page.getByText('No reward rules configured')).toBeVisible();

    // 4. Card A is ranked #1 and expanded by default: check outcome and cap headroom
    await expect(page.getByText('Rule Breakdown')).toBeVisible();
    await expect(page.getByText(/Outcome:/)).toBeVisible();
    await expect(page.getByText(/Cap headroom/)).toBeVisible();
  });
});
