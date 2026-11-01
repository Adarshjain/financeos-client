import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  addDays,
  addLending,
  createCounterparty,
  createLoan,
  monthsAgo,
  monthsAhead,
} from '../fixtures/seed/loans';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Loans and Obligations UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-loans');
    await loginContext(context, currentUser.cookie);
  });

  /** dd/mm/yyyy from an ISO date, as the date fields take it typed. */
  const typed = (iso: string) => iso.split('-').reverse().join('/');

  test('Loan Detail: schedule inspection, mark paid, prepayment event, charge, locked edit banner, transaction match, and close/reopen', async ({
    page,
  }) => {
    test.slow(); // long multi-step journey: 3x timeout under parallel load

    const api = makeApi(currentUser.cookie);
    const startDate = monthsAgo(3);

    const bankAccount = await createBankAccount(api, { name: 'Loan Linked Bank' });

    const loan = await createLoan(api, {
      name: 'UI Detail Loan',
      lender: 'SBI Bank',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
      paymentAccountId: bankAccount.id,
    });

    // Seed matching DEBIT transaction for unpaid installment #2 (due 2 months ago)
    // A twin loan with the same EMI dates and account makes the debit fit two installments, so the server's
    // auto-linker leaves it ambiguous and the match is left to Find matches below.
    await createLoan(api, {
      name: 'UI Detail Twin Loan',
      lender: 'SBI Bank',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
      paymentAccountId: bankAccount.id,
    });
    await createTransaction(api, bankAccount.id, {
      amount: -10661.85,
      date: addDays(monthsAgo(2), 1),
      description: 'SBI Loan EMI Match',
    });

    await page.goto(`/loans/${loan.id}`);

    // Hero title
    await expect(page.getByText('UI Detail Loan').first()).toBeVisible();

    // Schedule section
    await expect(page.getByText('Schedule', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('10,661.85').first()).toBeVisible();

    // 1. Mark paid on the first overdue installment, recorded without a transaction
    await page.getByRole('button', { name: 'Mark paid', exact: true }).first().click();
    const payDialog = page.getByRole('dialog', { name: /^Mark EMI #\d+ paid$/ });
    await expect(payDialog).toBeVisible();
    await payDialog.getByRole('radio', { name: 'Record payment without a transaction' }).click();
    await payDialog.getByRole('button', { name: 'Mark paid', exact: true }).click();
    await expect(payDialog).not.toBeVisible();
    // The paid row opens its EMI dialog, which offers Unlink.
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
    await page.getByRole('button').filter({ hasText: /Paid/ }).first().click();
    const emiDialog = page.getByRole('dialog', { name: /^EMI #\d+$/ });
    await expect(emiDialog.getByRole('button', { name: 'Unlink' })).toBeVisible();
    await emiDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(emiDialog).not.toBeVisible();

    // 2. Add event: Prepayment (reduce tenure)
    await page.getByRole('button', { name: 'Prepay', exact: true }).click();
    const eventDialog = page.getByRole('dialog', { name: 'Record event' });
    await expect(eventDialog).toBeVisible();
    await expect(eventDialog.getByRole('combobox', { name: /^Event type/ })).toContainText('Prepayment');
    await eventDialog.getByRole('textbox', { name: /^Amount/ }).fill('30000');
    await eventDialog.getByRole('textbox', { name: /^Effective date/ }).fill(typed(monthsAgo(1)));
    await eventDialog.getByRole('button', { name: 'Record event' }).click();
    await expect(eventDialog).not.toBeVisible();
    await expect(page.getByText('Events & charges')).toBeVisible();
    await expect(page.getByText(/prepayment/i).first()).toBeVisible();

    // 3. Add itemized charge
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Charge' }).click();
    const chargeDialog = page.getByRole('dialog', { name: 'Add charge' });
    await expect(chargeDialog).toBeVisible();
    await chargeDialog.getByRole('textbox', { name: /^Amount/ }).fill('2000');
    await chargeDialog.getByRole('textbox', { name: /^Charge date/ }).fill(typed(startDate));
    await chargeDialog.getByRole('button', { name: 'Add charge' }).click();
    await expect(chargeDialog).not.toBeVisible();
    await expect(page.getByText('Processing fee').first()).toBeVisible();

    // 4. Edit loan: core terms locked banner
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit loan' }).click();
    const editDialog = page.getByRole('dialog').filter({ hasText: 'locked' });
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByText(/Core terms .* are locked because events or payments exist/),
    ).toBeVisible();
    await editDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(editDialog).not.toBeVisible();

    // 5. EMI transaction matching
    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText(/SBI Loan EMI Match/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirm all' }).click();
    await expect(page.getByText('1 of 2 paid EMIs')).toBeVisible();

    // 6. Close loan and reopen loan
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Close loan' }).click();
    await expect(page.getByText(/closed/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Reopen loan' }).click();
    await expect(page.getByRole('button', { name: 'Prepay', exact: true })).toBeVisible();
  });

  test('Obligations moved to /upcoming: /loans/calendar redirects, overdue obligations, window filter, and receivable item', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const startDate = monthsAgo(3);

    // Seed a loan with overdue installments
    await createLoan(api, {
      name: 'Calendar Home Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    // Seed a lending receivable
    const cp = await createCounterparty(api, { name: 'Vikram Joshi' });
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 25000,
      entryDate: monthsAgo(1),
      expectedReturnDate: monthsAhead(1),
    });

    // The old calendar route now lands on the Upcoming page
    await page.goto('/loans/calendar');
    await page.waitForURL('**/upcoming');

    await expect(page.getByText('Upcoming', { exact: true }).first()).toBeVisible();

    // Overdue obligations section
    await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Calendar Home Loan/i).first()).toBeVisible();

    // Counterparty receivable item
    await expect(page.getByText(/Vikram Joshi/i).first()).toBeVisible();

    // Switch the horizon to 1 month
    await page.getByRole('button', { name: '3 months', exact: true }).click();
    await page.getByRole('option', { name: '1 month', exact: true }).click();

    await expect(page.getByText('Upcoming', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Calendar Home Loan/i).first()).toBeVisible();
  });

  test('Loan Detail: Edit, Close and Delete are reachable from the actions menu', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const loan = await createLoan(api, { name: 'Desktop Actions Loan' });

    await page.goto(`/loans/${loan.id}`);
    await expect(page.getByText('Desktop Actions Loan').first()).toBeVisible();

    await page.getByRole('button', { name: 'More actions' }).click();
    for (const name of ['Edit loan', 'Close loan', 'Delete']) {
      await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
    }
  });
});
