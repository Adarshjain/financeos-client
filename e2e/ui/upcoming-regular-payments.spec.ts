import { type ApiClient, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { detectRecurring } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

/** Four made-up monthly debits of one merchant, the newest 3 days ago (gaps of 31, 31 and 28 days). */
async function seedMonthly(api: ApiClient, accountId: string, description: string, amount: number): Promise<void> {
  for (const daysAgo of [93, 62, 31, 3]) {
    await createTransaction(api, accountId, { description, amount: -amount, date: istToday(-daysAgo) });
  }
}

async function proposalNames(api: ApiClient): Promise<string[]> {
  const res = await api.GET('/api/v1/recurring/proposals');
  return (res.data ?? []).map((p) => p.displayName);
}

test.describe('Upcoming: Regular payments (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-regular-payments');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a monthly series is found, tracked into Upcoming with its next due date, and stopped', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Regular Pay Bank', last4: '3301', openingBalance: 50000 });
    await seedMonthly(api, account.id, 'NETFLIX COM MUMBAI', 649);
    await detectRecurring(api);
    expect(await proposalNames(api)).toContain('Netflix Mumbai');

    await page.goto('/upcoming');
    await expect(page.getByText('Regular payments we found')).toBeVisible({ timeout: 45000 });
    const proposal = page.getByText('Netflix Mumbai').first();
    await expect(proposal).toBeVisible();
    await expect(page.getByText(/₹649(\.00)? monthly · 4 payments/)).toBeVisible();

    await page.getByRole('button', { name: 'Track', exact: true }).click();
    await expectToast(page, 'Tracking Netflix Mumbai');

    // The card goes and the series is a row on Upcoming, due a month after its last payment.
    await expect(page.getByText('Regular payments we found')).toHaveCount(0, { timeout: 30000 });
    const tracked = await api.GET('/api/v1/recurring/tracked');
    expect(tracked.data!.map((s) => s.displayName)).toEqual(['Netflix Mumbai']);
    const nextDue = tracked.data![0].nextDueOn;
    const nextDay = String(Number(nextDue.slice(8, 10)));
    const row = page.getByText('Netflix Mumbai').first().locator('xpath=ancestor::*[@data-slot="list-row" or self::li or self::div][.//button[@aria-label="More options"]][1]');
    const nextMonth = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(nextDue.slice(5, 7)) - 1];
    await expect(row).toContainText(`${nextDay}${nextMonth}`);
    await expect(row).toContainText(/in \d+ days/);
    await expect(row).toContainText('Regular Pay Bank');
    await expect(row).toContainText('Paid');
    await expect(row).toContainText('649');

    // Stop tracking from the row's menu.
    await row.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Stop tracking' }).click();
    await expectToast(page, 'Stopped tracking Netflix Mumbai');
    await expect(page.getByText('Netflix Mumbai')).toHaveCount(0, { timeout: 30000 });
    expect((await api.GET('/api/v1/recurring/tracked')).data).toEqual([]);
  });

  test('Not regular dismisses a suggestion, and it is not suggested again', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Dismiss Pay Bank', last4: '3302', openingBalance: 50000 });
    await seedMonthly(api, account.id, 'BRIGHT GYM FEES', 1500);
    await detectRecurring(api);
    expect(await proposalNames(api)).toContain('Bright Gym Fees');

    await page.goto('/upcoming');
    await expect(page.getByText('Bright Gym Fees')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(/₹1,500(\.00)? monthly · 4 payments/)).toBeVisible();
    await expect(page.getByText('Regular payment').first()).toBeVisible();
    await page.getByRole('button', { name: 'Not regular' }).click();
    await expectToast(page, "Got it, we won't suggest Bright Gym Fees again");
    await expect(page.getByText('Regular payments we found')).toHaveCount(0, { timeout: 30000 });
    expect(await proposalNames(api)).toEqual([]);

    // Detection runs again and it is still not back.
    await detectRecurring(api);
    expect(await proposalNames(api)).toEqual([]);
    await page.reload();
    await expect(page.getByText('Bright Gym Fees')).toHaveCount(0);
  });

  test('fewer than three payments, or uneven amounts, are not suggested', async ({ page }) => {
    const api = makeApi(user.cookie);
    const account = await createBankAccount(api, { name: 'Quiet Pay Bank', last4: '3303', openingBalance: 50000 });
    for (const daysAgo of [62, 31]) {
      await createTransaction(api, account.id, { description: 'TWO TIMES ONLY MART', amount: -300, date: istToday(-daysAgo) });
    }
    let amount = 100;
    for (const daysAgo of [93, 62, 31]) {
      await createTransaction(api, account.id, { description: 'UNEVEN AMOUNT STORE', amount: -amount, date: istToday(-daysAgo) });
      amount *= 3;
    }
    // Plus one real series so we know detection has run for this user.
    await seedMonthly(api, account.id, 'SPOTIFY INDIA', 119);
    await detectRecurring(api);
    expect(await proposalNames(api)).toContain('Spotify');
    expect(await proposalNames(api)).toEqual(['Spotify']);

    await page.goto('/upcoming');
    await expect(page.getByText('Spotify')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Two Times Only Mart')).toHaveCount(0);
    await expect(page.getByText('Uneven Amount Store')).toHaveCount(0);
  });
});
