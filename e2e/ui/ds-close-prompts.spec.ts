import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { ageAccount } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createLoan, getLoan } from '../fixtures/seed/loans';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const closedOn = async (api: ReturnType<typeof makeApi>, id: string) =>
  (await api.GET('/api/v1/accounts/{id}', { params: { path: { id } } })).data?.closedOn ?? null;

test.describe('Close prompts (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-close-prompts');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test.describe('Close this account?', () => {
    test('an idle account with no balance asks; Cancel keeps it open, Close account closes it with Undo, Undo reopens', async ({ page }) => {
      const api = makeApi(user.cookie);
      const account = await createBankAccount(api, { name: 'Idle Empty Bank', last4: '5501', openingBalance: 0 });
      await ageAccount(api, account.id, 100);

      await page.goto(`/accounts/${account.id}`);
      const prompt = page.getByText('Close this account?').first();
      await expect(prompt).toBeVisible({ timeout: 45000 });
      await expect(page.getByText('No transactions yet. Balance ₹0.00.')).toBeVisible();

      // Close opens a confirmation; Cancel changes nothing.
      const dialog = page.getByRole('dialog', { name: 'Close this account?' });
      await expect(async () => {
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(dialog).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 30000 });
      await expect(dialog).toContainText('It will be closed as of today. You can reopen it later.');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await closedOn(api, account.id)).toBeNull();
      await expect(prompt).toBeVisible();

      // Close account closes it as of today and offers Undo.
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.getByRole('button', { name: 'Close account' }).click();
      await expectToast(page, 'Account closed');
      expect(await closedOn(api, account.id)).toBe(istToday());
      await expect(page.getByText('No transactions yet. Balance ₹0.00.')).toHaveCount(0, { timeout: 30000 });

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect.poll(() => closedOn(api, account.id), { timeout: 30000 }).toBeNull();
    });

    test('Not yet hides the prompt and it stays away after a reload', async ({ page }) => {
      const api = makeApi(user.cookie);
      const account = await createBankAccount(api, { name: 'Idle Dismiss Bank', last4: '5502', openingBalance: 0 });
      await ageAccount(api, account.id, 100);

      await page.goto(`/accounts/${account.id}`);
      await expect(page.getByText('No transactions yet. Balance ₹0.00.')).toBeVisible({ timeout: 45000 });
      await expect(async () => {
        await page.getByRole('button', { name: 'Not yet', exact: true }).click();
        await expect(page.getByText('No transactions yet. Balance ₹0.00.')).toHaveCount(0, { timeout: 3000 });
      }).toPass({ timeout: 30000 });
      expect(await closedOn(api, account.id)).toBeNull();

      await page.reload();
      await expect(page.getByRole('heading', { name: 'Idle Dismiss Bank' }).or(page.getByText('Idle Dismiss Bank').first())).toBeVisible({ timeout: 45000 });
      await expect(page.getByText('No transactions yet. Balance ₹0.00.')).toHaveCount(0);
    });

    test('a new account, or one with a balance, is not asked about', async ({ page }) => {
      const api = makeApi(user.cookie);
      const fresh = await createBankAccount(api, { name: 'Fresh Empty Bank', last4: '5503', openingBalance: 0 });
      const funded = await createBankAccount(api, { name: 'Old Funded Bank', last4: '5504', openingBalance: 500 });
      await ageAccount(api, funded.id, 100);

      for (const id of [fresh.id, funded.id]) {
        await page.goto(`/accounts/${id}`);
        await expect(page.getByText(/Fresh Empty Bank|Old Funded Bank/).first()).toBeVisible({ timeout: 45000 });
        await expect(page.getByText('Close this account?')).toHaveCount(0);
      }
    });
  });

  test.describe('Is this loan closed?', () => {
    // First instalment 60 days ago and never paid: 45+ days overdue.
    const overdueLoan = (name: string) =>
      createLoan(makeApi(user.cookie), {
        name,
        principal: 12000,
        annualRatePct: 12,
        tenureMonths: 12,
        startDate: istToday(-90),
        firstEmiDate: istToday(-60),
      });

    test('Upcoming asks once for the loan; Yes, closed closes it', async ({ page }) => {
      const api = makeApi(user.cookie);
      const loan = await overdueLoan('Long Overdue Loan');
      expect((await getLoan(api, loan.id)).askClosed).toBe(true);

      await page.goto('/upcoming');
      await expect(page.getByText('Long Overdue Loan').first()).toBeVisible({ timeout: 45000 });
      await expect(page.getByText('Is this loan closed?')).toHaveCount(1);
      await expect(async () => {
        await page.getByRole('button', { name: 'Yes, closed', exact: true }).click();
        await expect(page.getByText('Is this loan closed?')).toHaveCount(0, { timeout: 3000 });
      }).toPass({ timeout: 30000 });
      await expect.poll(async () => (await getLoan(api, loan.id)).loan.status, { timeout: 30000 }).not.toBe('active');
      await expect(page.getByText('Long Overdue Loan')).toHaveCount(0, { timeout: 30000 });
    });

    test('Upcoming: Not yet hides the question, the loan stays active', async ({ page }) => {
      const api = makeApi(user.cookie);
      const loan = await overdueLoan('Not Yet Loan');

      await page.goto('/upcoming');
      await expect(page.getByText('Is this loan closed?')).toHaveCount(1, { timeout: 45000 });
      await expect(async () => {
        await page.getByRole('button', { name: 'Not yet', exact: true }).click();
        await expect(page.getByText('Is this loan closed?')).toHaveCount(0, { timeout: 3000 });
      }).toPass({ timeout: 30000 });
      const after = await getLoan(api, loan.id);
      expect(after.loan.status).toBe('active');
      expect(after.askClosed).toBe(false);
    });

    test('the loan page asks too: Not yet hides it, and Yes, closed closes the loan', async ({ page }) => {
      const api = makeApi(user.cookie);
      const notYet = await overdueLoan('Page Not Yet Loan');
      await page.goto(`/loans/${notYet.id}`);
      await expect(page.getByText('Is this loan closed?')).toBeVisible({ timeout: 45000 });
      await expect(page.getByText(/EMI #1 was due on .* and has no payment for \d+ days\./)).toBeVisible();
      await expect(page.getByText('No payment recorded yet.')).toBeVisible();
      await expect(async () => {
        await page.getByRole('button', { name: 'Not yet', exact: true }).click();
        await expect(page.getByText('Is this loan closed?')).toHaveCount(0, { timeout: 3000 });
      }).toPass({ timeout: 30000 });
      expect((await getLoan(api, notYet.id)).askClosed).toBe(false);

      const yes = await overdueLoan('Page Yes Loan');
      await page.goto(`/loans/${yes.id}`);
      await expect(page.getByText('Is this loan closed?')).toBeVisible({ timeout: 45000 });
      await expect(async () => {
        await page.getByRole('button', { name: 'Yes, closed', exact: true }).click();
        await expect(page.getByText('Is this loan closed?')).toHaveCount(0, { timeout: 3000 });
      }).toPass({ timeout: 30000 });
      await expect.poll(async () => (await getLoan(api, yes.id)).loan.status, { timeout: 30000 }).not.toBe('active');
      await expect(page.getByRole('button', { name: 'Prepay' })).toHaveCount(0);
    });

    test('a loan that is only a little overdue is not asked about', async ({ page }) => {
      const api = makeApi(user.cookie);
      const loan = await createLoan(api, {
        name: 'Barely Late Loan',
        principal: 12000,
        annualRatePct: 12,
        tenureMonths: 12,
        startDate: istToday(-40),
        firstEmiDate: istToday(-10),
      });
      await page.goto(`/loans/${loan.id}`);
      await expect(page.getByText('Barely Late Loan').first()).toBeVisible({ timeout: 45000 });
      await expect(page.getByText('Is this loan closed?')).toHaveCount(0);
    });
  });
});
