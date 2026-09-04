import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createRewardCard,
  createRule,
  fixedMonth,
  spend,
} from '../fixtures/seed/rewards';
import { expect, test } from '../fixtures/test';

test.describe('Rewards Browser UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-rewards');
    await loginContext(context, currentUser.cookie);
  });

  test('view reward summaries, rule breakdown, line detail dialog and anniversary fallback banner', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const month = fixedMonth();

    // 1. Seed Card with anniversary and rules + spends
    const { account: card } = await createRewardCard(api, {
      name: 'UI Rewards Card',
      anniversaryDate: '2025-06-01',
    });

    const rule = await createRule(api, card.id, {
      name: 'UI 2% Flat Rule',
      accrualType: 'PERCENT',
      percentRate: 2.0,
      rounding: 'NONE',
    });

    await spend(api, card.id, {
      amount: 1500,
      date: `${month.from.slice(0, 7)}-10`,
      description: 'Supermarket Grocery Spend',
    });

    // 2. Seed Account without anniversary date (Bank Account) to test banner
    const noAnivCard = await createBankAccount(api, {
      name: 'UI No Anniversary Account',
    });
    await createRule(api, noAnivCard.id, {
      name: 'Anniversary Rule on No-Aniv Card',
      accrualType: 'PERCENT',
      percentRate: 5.0,
      periodCap: 100,
      capWindow: 'ANNIVERSARY_YEAR',
    });
    await spend(api, noAnivCard.id, {
      amount: 500,
      date: `${month.from.slice(0, 7)}-12`,
    });

    // Navigate to /rewards
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');

    // Heading "Rewards"
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible();

    // Select the first card
    const accountSelect = page.locator('button[role="combobox"]:visible').first();
    await accountSelect.click();
    await page.getByRole('option', { name: 'UI Rewards Card' }).click();

    // Select preset "This anniversary year" or "This month"
    const presetSelect = page.locator('button[role="combobox"]:visible').nth(1);
    await presetSelect.click();
    await page.getByRole('option', { name: 'This anniversary year' }).click();

    // Verify summary tiles
    await expect(page.getByText('Eligible spend')).toBeVisible();
    await expect(page.getByText('Gross rewards')).toBeVisible();

    // Rule breakdown
    await expect(page.getByText('UI 2% Flat Rule').first()).toBeVisible();

    // Verify lines table contains the spend
    const spendRow = page.getByRole('cell', { name: 'Supermarket Grocery Spend' });
    await expect(spendRow).toBeVisible();

    // Click line row to open line detail dialog
    await spendRow.click();
    await expect(page.getByText('Reward Calculation')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Switch to no-anniversary card to check anniversary fallback banner
    await accountSelect.click();
    await page.getByRole('option', { name: 'UI No Anniversary Account' }).click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Some anniversary-year windows fell back to calendar years')
    ).toBeVisible();
  });

  test('rewards tiles view on mobile viewport (@mobile)', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const month = fixedMonth();
    const { account } = await createRewardCard(api, {
      name: 'Mobile Rewards CC',
      anniversaryDate: '2025-06-01',
    });

    await createRule(api, account.id, {
      name: 'Mobile 1% Base',
      accrualType: 'PERCENT',
      percentRate: 1.0,
    });

    await spend(api, account.id, {
      amount: 1000,
      date: `${month.from.slice(0, 7)}-05`,
      description: 'Mobile Test Swipe',
    });

    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible();
    await expect(page.getByText('Eligible spend')).toBeVisible();
    await expect(page.getByText('Gross rewards')).toBeVisible();
  });
});
