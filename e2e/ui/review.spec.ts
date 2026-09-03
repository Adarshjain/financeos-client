import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Review & Transaction Links UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-review');
    await loginContext(context, currentUser.cookie);
  });

  test('/transactions/review: review browser header, filter bar, and empty state', async ({
    page,
  }) => {
    await page.goto('/transactions/review');

    // 1. Verify header
    await expect(
      page.getByRole('heading', { name: 'Review Transactions' })
    ).toBeVisible();

    // 2. Verify empty state when no transactions have NEEDS_REVIEW
    // (Manual transactions have ReviewType.NA; real review reasons are produced in Phase 8 ingestion)
    await expect(page.getByText('No transactions need review')).toBeVisible();
  });

  test('/transactions/review: mobile viewport journey @mobile', async ({
    page,
  }) => {
    await page.goto('/transactions/review');

    await expect(
      page.getByRole('heading', { name: 'Review Transactions' })
    ).toBeVisible();
    await expect(page.getByText('No transactions need review')).toBeVisible();
  });

  test('/transactions: link dialog create and unlink flow', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bankA = await createBankAccount(api, { name: 'Link Bank Alpha' });
    const bankB = await createBankAccount(api, { name: 'Link Bank Beta' });

    await createTransaction(api, bankA.id, {
      amount: -3000,
      description: 'Transfer Out to Beta',
    });
    await createTransaction(api, bankB.id, {
      amount: 3000,
      description: 'Transfer In from Alpha',
    });

    await page.goto('/transactions');

    // Click on the debit transaction card to open detail sheet
    await page.getByText('Transfer Out to Beta').click();

    const detailSheet = page.getByRole('dialog');
    await expect(detailSheet).toBeVisible();

    // Click "Link to…" button to open TransactionLinkDialog
    await detailSheet.getByRole('button', { name: /Link to…/i }).click();

    // Link dialog is opened
    const linkDialog = page.getByRole('dialog', { name: /Link Transactions/i });
    await expect(linkDialog).toBeVisible();

    // Candidate list shows the counterpart transaction: click Add
    await linkDialog.getByRole('button', { name: 'Add' }).first().click();

    // Click "Link Transactions"
    await linkDialog.getByRole('button', { name: 'Link Transactions' }).click();
    await expect(linkDialog).not.toBeVisible();

    // After linking, detail sheet was dismissed; transaction row now displays link badge
    await expect(page.getByText(/Parent • Transfer out/i)).toBeVisible();

    // Re-open detail sheet to inspect Linked Transactions and test unlink
    await page.getByText('Transfer Out to Beta').click();
    const reopenedDetail = page.getByRole('dialog');
    await expect(reopenedDetail).toBeVisible();

    await expect(reopenedDetail.getByText('Linked Transactions')).toBeVisible();
    await expect(reopenedDetail.getByText('Transfer in', { exact: true })).toBeVisible();

    // Unlink
    await reopenedDetail.getByRole('button', { name: 'Unlink' }).click();
    await expect(reopenedDetail.getByText('Linked Transactions')).not.toBeVisible();
  });
});
