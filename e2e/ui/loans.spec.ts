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

  test('Loans Browser: create loan, browse list, status filter, and search', async ({ page }) => {
    await page.goto('/loans');
    await page.waitForLoadState('networkidle');

    // Page Heading
    await expect(page.getByRole('heading', { name: /Formal Loans/i })).toBeVisible();

    // Click Add Loan
    await page.getByRole('button', { name: /Add Loan/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create New Loan' })).toBeVisible();

    // Fill form
    const startDate = monthsAgo(3);
    await page.locator('#name').fill('HDFC Car Loan UI');
    await page.locator('#lender').fill('HDFC Bank');
    await page.locator('#principal').fill('120000');
    await page.locator('#annualRatePct').fill('12');
    await page.locator('#tenureMonths').fill('12');
    await page.locator('#startDate').fill(startDate);
    await page.locator('#firstEmiDate').fill(startDate);

    // Submit form
    await page.getByRole('button', { name: 'Create Loan' }).click();

    // Verify row appeared in list
    await expect(page.getByRole('heading', { name: 'Formal Loans (1)' })).toBeVisible();
    await expect(page.locator('text=HDFC Car Loan UI >> visible=true').first()).toBeVisible();

    // Status Filter: filter by Closed
    const statusSelect = page.locator('button[role="combobox"]:visible').first();
    await statusSelect.click();
    await page.getByRole('option', { name: 'Closed', exact: true }).click();
    await expect(page.locator('text="No loans found matching your criteria." >> visible=true').first()).toBeVisible();

    // Switch back to All Statuses
    await statusSelect.click();
    await page.getByRole('option', { name: 'All Statuses', exact: true }).click();
    await expect(page.locator('text=HDFC Car Loan UI >> visible=true').first()).toBeVisible();

    // Search filter
    const searchInput = page.locator('input[placeholder="Search loans or lenders..."]:visible').first();
    await searchInput.fill('NonExistentLender');
    await expect(page.locator('text="No loans found matching your criteria." >> visible=true').first()).toBeVisible();

    await searchInput.fill('HDFC');
    await expect(page.locator('text=HDFC Car Loan UI >> visible=true').first()).toBeVisible();
  });

  test('Loan Detail: schedule inspection, mark paid, prepayment event, charge, locked edit banner, transaction match, and close/reopen', async ({
    page,
  }) => {
    test.slow(); // long multi-step journey: 3x timeout under parallel load

    // Detail action buttons (Edit, Close, Delete) are housed in PageActionBar (lg:hidden mobile/tablet bar)
    await page.setViewportSize({ width: 768, height: 1024 });

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
    await createTransaction(api, bankAccount.id, {
      amount: -10661.85,
      date: addDays(monthsAgo(2), 1),
      description: 'SBI Loan EMI Match',
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    // Hero title
    await expect(page.getByRole('heading', { name: 'UI Detail Loan' })).toBeVisible();

    // Amortization Schedule section
    await expect(page.getByRole('heading', { name: 'Amortization Schedule' })).toBeVisible();
    await expect(page.getByText('₹10,661.85').first()).toBeVisible();

    // 1. Mark Paid on seq 1
    const markPaidBtn = page.getByRole('button', { name: 'Mark Paid' }).first();
    await markPaidBtn.click();
    await expect(page.getByRole('heading', { name: /Settle Installment #1/i })).toBeVisible();

    // Submit payment
    await page.getByRole('button', { name: 'Confirm Settle' }).click();
    await expect(page.getByRole('button', { name: 'Unlink' }).first()).toBeVisible();

    // 2. Add Event: Prepayment (Reduce Tenure)
    await page.getByRole('button', { name: /Add Event/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Record Lifecycle Event' })).toBeVisible();

    // Select Prepayment
    const eventTypeSelect = page.locator('#add-event-form button[role="combobox"]').first();
    await eventTypeSelect.click();
    await page.getByRole('option', { name: 'Prepayment', exact: true }).click();

    await page.locator('#add-event-form input[type="number"]').fill('30000');
    await page.locator('#add-event-form input[type="date"]').fill(monthsAgo(1));
    await page.getByRole('button', { name: 'Record Event' }).click();

    // 3. Add Itemized Charge
    await page.getByRole('button', { name: /Add Charge/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Itemized Charge' })).toBeVisible();
    await page.locator('#add-charge-form input[type="number"]').fill('2000');
    await page.locator('#add-charge-form input[type="date"]').fill(startDate);
    await page.getByRole('dialog').getByRole('button', { name: 'Add Charge' }).click();
    await expect(page.getByText('Processing Fee').first()).toBeVisible();

    // 4. Edit Loan: Core terms locked banner
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit Loan' })).toBeVisible();
    await expect(
      page.getByText('Core terms (principal, rate, tenure, dates, EMI) are locked because events or payments exist.')
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 5. EMI Transaction Matching
    await page.getByRole('button', { name: 'Find Matches' }).click();
    await expect(page.getByText('SBI Loan EMI Match')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();

    // 6. Close Loan and Reopen Loan
    await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Close Loan' })).toBeVisible();
    await page.getByRole('button', { name: 'Close Loan', exact: true }).click();
    await expect(page.getByText(/closed/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Reopen', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Reopen Loan' })).toBeVisible();
    await page.getByRole('button', { name: 'Reopen Loan', exact: true }).click();
    await expect(page.getByText(/active/i).first()).toBeVisible();
  });

  test('Obligations Calendar: overdue obligations, monthly projection, window filter, and receivable item', async ({
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

    await page.goto('/loans/calendar');
    await page.waitForLoadState('networkidle');

    // Hero title
    await expect(page.getByRole('heading', { name: 'Obligations Calendar' })).toBeVisible();

    // Overdue obligations card
    await expect(page.getByText(/Overdue Obligations/i).first()).toBeVisible();
    await expect(page.getByText(/Calendar Home Loan/i).first()).toBeVisible();

    // Counterparty receivable item
    await expect(page.getByText(/Vikram Joshi \(Receivable\)/i).first()).toBeVisible();

    // Switch Schedule Window to 1 Month
    const windowSelect = page.locator('button[role="combobox"]:visible').first();
    await windowSelect.click();
    await page.getByRole('option', { name: '1 Month', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Obligations Calendar' })).toBeVisible();
  });

  test('Mobile Amortization and Mark Paid journey (@mobile)', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const startDate = monthsAgo(2);
    const loan = await createLoan(api, {
      name: 'Mobile Loan',
      principal: 60000,
      annualRatePct: 10,
      tenureMonths: 6,
      startDate,
      firstEmiDate: startDate,
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Mobile Loan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Amortization Schedule' })).toBeVisible();

    // Click Mark Paid on mobile card
    const markPaidBtn = page.getByRole('button', { name: 'Mark Paid' }).first();
    await markPaidBtn.click();
    await expect(page.getByRole('heading', { name: /Settle Installment #1/i })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Settle' }).click();

    await expect(page.getByRole('button', { name: 'Unlink' }).first()).toBeVisible();
  });
});
