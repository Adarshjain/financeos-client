import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Review & Transaction Links UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });
  let currentUser: CreatedUser;

  const reviewSeedSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '7788990011',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      // Duplicate pair (both get DUPLICATE_SUSPECT and CATEGORY_UNVERIFIED)
      { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
      { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
      // Single row (gets only CATEGORY_UNVERIFIED)
      { date: '2026-04-12', description: 'UBER TRIP AIRPORT', debit: 1250.0 },
    ],
  };

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-review');
    await loginContext(context, currentUser.cookie);
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async () => {
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
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

  test('/transactions/review: batch approve partial-success summary and duplicate merge flows', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'Review UI Account',
      openingBalance: reviewSeedSpec.opening,
    });

    const pdfBuffer = await genBankPdf(reviewSeedSpec);
    await uploadAndIngest(api, account.id, [
      { filename: 'review-ui-stmt.pdf', buffer: pdfBuffer },
    ]);

    await page.goto('/transactions/review');

    // 1. Header & reason badges visible
    await expect(
      page.getByRole('heading', { name: 'Review Transactions' })
    ).toBeVisible();
    await expect(page.getByText('Possible duplicate').first()).toBeVisible();
    await expect(page.getByText('Category unverified').first()).toBeVisible();

    // 2. Select 2 rows: one with Possible duplicate (first Swiggy row) and one without (Uber row)
    const rowCheckboxes = page.locator('[id^="select-"]:not(#select-all-page)');
    await rowCheckboxes.nth(0).click({ force: true });
    await rowCheckboxes.nth(2).click({ force: true });

    // Verify bulk action bar shows "2 selected"
    await expect(page.locator('main').getByText('2 selected')).toBeVisible();

    // 3. Click "Approve" to open ReviewApproveDialog
    await page.getByRole('button', { name: 'Approve' }).first().click();

    const approveDialog = page.getByRole('dialog');
    await expect(approveDialog).toBeVisible();
    await expect(approveDialog.getByText('Approve Transactions')).toBeVisible();

    // In dialog, ensure ONLY "Possible duplicate" is checked (uncheck "Category unverified" if checked)
    const catUnverifiedBox = approveDialog.getByRole('checkbox', {
      name: /Category unverified/i,
    });
    if ((await catUnverifiedBox.getAttribute('aria-checked')) === 'true') {
      await catUnverifiedBox.click();
    }
    const dupBox = approveDialog.getByRole('checkbox', {
      name: /Possible duplicate/i,
    });
    if ((await dupBox.getAttribute('aria-checked')) !== 'true') {
      await dupBox.click();
    }

    // Click "Approve" button inside dialog
    await approveDialog.getByRole('button', { name: 'Approve' }).click();

    // 4. Batch Action Summary dialog opens: 1 Succeeded, 1 Skipped
    const summaryDialog = page.getByRole('dialog');
    await expect(summaryDialog.getByText('Batch Action Summary')).toBeVisible();
    await expect(summaryDialog.getByText('1', { exact: true }).first()).toBeVisible();
    await expect(summaryDialog.getByText('Succeeded')).toBeVisible();
    await expect(summaryDialog.getByText('Skipped', { exact: true })).toBeVisible();

    // Close summary dialog
    await summaryDialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(summaryDialog).not.toBeVisible();

    // 5. Merge the duplicate pair
    // Re-select the two Swiggy rows (indices 1 and 2, since index 0 is Uber)
    const mergeCheckboxes = page.locator('[id^="select-"]:not(#select-all-page)');
    await mergeCheckboxes.nth(1).click({ force: true });
    await mergeCheckboxes.nth(2).click({ force: true });

    // Click "Merge"
    await page.getByRole('button', { name: 'Merge' }).first().click();

    const mergeDialog = page.getByRole('dialog');
    await expect(mergeDialog).toBeVisible();
    await expect(mergeDialog.getByText('Merge Transactions')).toBeVisible();

    // Click "Merge and resolve"
    await mergeDialog.getByRole('button', { name: /Merge and resolve/i }).click();

    // Verify one of the Swiggy rows was deleted
    await expect(page.getByText('SWIGGY ORDER BANGALORE')).toHaveCount(1);
  });

  test('/transactions/review: batch approve journey @mobile', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, {
      name: 'Review Mobile Account',
      openingBalance: reviewSeedSpec.opening,
    });

    const pdfBuffer = await genBankPdf(reviewSeedSpec);
    await uploadAndIngest(api, account.id, [
      { filename: 'review-mobile-stmt.pdf', buffer: pdfBuffer },
    ]);

    await page.goto('/transactions/review');

    await expect(
      page.getByRole('heading', { name: 'Review Transactions' })
    ).toBeVisible();

    // Select all on page using header checkbox
    const selectAllCheckbox = page.locator('#select-all-page');
    await selectAllCheckbox.click();

    // Click Approve
    await page.getByRole('button', { name: 'Approve' }).first().click();

    const approveDialog = page.getByRole('dialog');
    await expect(approveDialog).toBeVisible();
    await expect(approveDialog.getByText('Approve Transactions')).toBeVisible();

    // Click Approve in dialog
    await approveDialog.getByRole('button', { name: 'Approve' }).click();

    // Verify toast on full success
    await expect(page.getByText(/Successfully approved/i)).toBeVisible();
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
    await expect(
      reopenedDetail.getByText('Transfer in', { exact: true })
    ).toBeVisible();

    // Unlink
    await reopenedDetail.getByRole('button', { name: 'Unlink' }).click();
    await expect(
      reopenedDetail.getByText('Linked Transactions')
    ).not.toBeVisible();
  });
});
