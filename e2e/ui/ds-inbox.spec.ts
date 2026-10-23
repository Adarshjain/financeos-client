import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedDueSoonLoan } from '../fixtures/seed/obligations';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

const reviewSeedSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '7788990022',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 50000.0,
  rows: [
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-12', description: 'UBER TRIP AIRPORT', debit: 1250.0 },
  ],
};

const row = (page: Page, key: string) => page.locator(`[data-inbox-key="${key}"]`);
const toastAction = (page: Page, label: string) => page.locator('[data-sonner-toast]').getByRole('button', { name: label }).first();

test.describe('/ds Inbox right-click menu, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-inbox');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('right-click an EMI row offers Snooze only; it snoozes with an Undo toast', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const loan = await seedDueSoonLoan(api, 'Ds Inbox Loan');
    const emiKey = `emi:${loan.id}:1`;
    await page.goto('/ds/inbox');
    await expect(row(page, emiKey)).toBeVisible({ timeout: 45_000 });

    await row(page, emiKey).click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Snooze' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Dismiss' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Snooze' }).click();
    await expectToast(page, /Snoozed until/);
    await expect(row(page, emiKey)).toHaveCount(0);

    await toastAction(page, 'Undo').click();
    await expect(row(page, emiKey)).toBeVisible();
  });

  test('right-click the review summary row offers Dismiss only; it dismisses with an Undo toast', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    const bank = await createBankAccount(api, { name: 'Ds Inbox Bank', openingBalance: reviewSeedSpec.opening });
    await uploadAndIngest(api, bank.id, [{ filename: 'ds-inbox-review.pdf', buffer: await genBankPdf(reviewSeedSpec) }]);

    await page.goto('/ds/inbox');
    await expect(row(page, 'review')).toBeVisible({ timeout: 45_000 });

    await row(page, 'review').click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Snooze' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Dismiss' }).click();
    await expectToast(page, 'Dismissed');
    await expect(row(page, 'review')).toHaveCount(0);

    await toastAction(page, 'Undo').click();
    await expect(row(page, 'review')).toBeVisible();
  });
});
