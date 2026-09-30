import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createRewardCard, createRewardRule, fixedMonth, setRewardConfig, spend } from '../fixtures/seed/rewards';
import { expect, test } from '../fixtures/test';

test.describe('Reward reports UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-reward-reports');
    await loginContext(context, currentUser.cookie);
  });

  test('the Rule filter on Reward Earnings lists the user\'s rules and filters the preview', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'UI Report Card' });
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await createRewardRule(api, account.id, { name: 'Stack 2%', stacking: 'ADDITIVE', percentRate: 2, priority: 5 });
    await spend(api, account.id, { amount: 1000, date: `${month.from.slice(0, 7)}-10` });

    await page.goto('/reports/new');
    await expect(page.getByRole('heading', { name: 'Create Report' })).toBeVisible();
    await page.getByPlaceholder('Report name').fill('Base rule rewards');

    await page.getByRole('combobox').filter({ hasText: 'Transactions' }).first().click();
    await page.getByRole('option', { name: 'Reward Earnings' }).click();

    // A new filter row starts on the first filterable field (Effective Date).
    await page.getByRole('button', { name: /Add filter rule/i }).click();
    await page.getByRole('combobox').filter({ hasText: 'Effective Date' }).last().click();
    await page.getByRole('option', { name: 'Rule', exact: true }).click();

    await page.getByRole('combobox').filter({ hasText: 'Select option…' }).last().click();
    await expect(page.getByRole('option', { name: 'Base 1%' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Stack 2%' })).toBeVisible();
    await page.getByRole('option', { name: 'Base 1%' }).click();

    await page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first().click();
    await page.getByRole('option', { name: 'Reward value (₹)' }).click();

    await page.getByRole('button', { name: /^Preview$|Refresh preview/i }).first().click();
    await expect(page.getByText('₹10.00').first()).toBeVisible();
  });

  test('the Rewards page counts valued points in gross rewards', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const { account } = await createRewardCard(api, { name: 'UI Valued Points Card', anniversaryDate: '2025-06-01' });
    await setRewardConfig(api, account.id, { pointValueInr: 0.5 });
    await createRewardRule(api, account.id, {
      name: 'Slab points',
      rewardType: 'POINTS',
      accrualType: 'SLAB',
      slabSize: 100,
      pointsPerSlab: 2,
      pointPrecision: 0,
    });
    await spend(api, account.id, { amount: 1000, date: new Date().toISOString().slice(0, 10) });

    await page.goto('/rewards');
    await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible();
    await page.locator('button[role="combobox"]:visible').first().click();
    await page.getByRole('option', { name: 'UI Valued Points Card' }).click();
    await page.locator('button[role="combobox"]:visible').nth(1).click();
    await page.getByRole('option', { name: 'This anniversary year' }).click();

    await expect(page.getByText('(pts = ₹10.00)').first()).toBeVisible();
    await expect(page.getByText('+ 20 pts')).toHaveCount(0);
  });
});
