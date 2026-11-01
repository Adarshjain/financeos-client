import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createRewardCard, createRewardRule, fixedMonth, setRewardConfig, spend } from '../fixtures/seed/rewards';
import { expect, test } from '../fixtures/test';

test.describe('Reward reports UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-reward-reports');
    await loginContext(context, currentUser.cookie);
  });

  // BUG (Dinero report editor): useReportDynamicOptions only fetches once a filter on a dynamic field is applied, but the
  // Add filter popover edits a draft, so the Rule dropdown stays on "Loading…" and the user cannot pick a rule.
  test.fixme('the Rule filter on Reward Earnings lists the user\'s rules and filters the preview', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const month = fixedMonth();
    const { account } = await createRewardCard(api, { name: 'UI Report Card' });
    await createRewardRule(api, account.id, { name: 'Base 1%', percentRate: 1 });
    await createRewardRule(api, account.id, { name: 'Stack 2%', stacking: 'ADDITIVE', percentRate: 2, priority: 5 });
    await spend(api, account.id, { amount: 1000, date: `${month.from.slice(0, 7)}-10` });

    await page.goto('/reports/new');
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByLabel('Report name').fill('Base rule rewards');

    await page.getByRole('combobox', { name: 'Datasource', exact: true }).click();
    await page.getByRole('option', { name: 'Reward Earnings' }).click();

    // A new filter starts on the first filterable field; pick the Rule field and one of the user's rules.
    await page.getByRole('button', { name: 'Add filter', exact: true }).click();
    await page.getByRole('combobox', { name: 'Field', exact: true }).click();
    await page.getByRole('option', { name: 'Rule', exact: true }).click();

    await page.getByRole('combobox', { name: /^Values?$/ }).click();
    await expect(page.getByRole('option', { name: 'Base 1%' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Stack 2%' })).toBeVisible();
    await page.getByRole('option', { name: 'Base 1%' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Apply filter' }).click();

    await page.getByRole('combobox', { name: 'Measure', exact: true }).click();
    await page.getByRole('option', { name: 'Reward value (₹)' }).click();

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText(/₹10(\.00)?$/).first()).toBeVisible({ timeout: 45_000 });
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
    await spend(api, account.id, { amount: 1000, date: istToday() });

    // Overview: points count at their rupee value in what the card earned this year.
    await page.goto('/rewards');
    await expect(page.getByText('Earned this year', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('₹10', { exact: true }).first()).toBeVisible();

    // The card page shows both: the points and what they are worth.
    await page.goto(`/rewards/cards/${account.id}`);
    await expect(page.getByText('20 pts').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('≈ ₹10 at ₹0.50 / pt')).toBeVisible();
  });
});
