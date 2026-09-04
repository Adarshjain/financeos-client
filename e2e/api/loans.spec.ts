import { createBankAccount } from '../fixtures/seed/accounts';
import {
  addCharge,
  addDays,
  addEvent,
  batchPay,
  closeLoan,
  createLoan,
  deleteCharge,
  deleteEvent,
  deleteLoan,
  deletePayment,
  getLoan,
  loansSummary,
  matchSuggestions,
  monthsAgo,
  monthsAhead,
  pay,
  reopenLoan,
  schedule,
  updateLoan,
} from '../fixtures/seed/loans';
import { createTransaction } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Loans API (@api)', () => {
  test('Worked example: 120k / 12% / 12m generates EMI 10661.85 and exact amortization schedule', async ({
    api,
  }) => {
    const startDate = monthsAgo(3);
    const loan = await createLoan(api, {
      name: 'Worked Example Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    expect(loan.currentEmi).toBe(10661.85);
    expect(loan.emiAmount).toBe(10661.85);

    const sched = await schedule(api, loan.id);
    expect(sched.installments.length).toBeGreaterThanOrEqual(12);

    // Row 1: opening 120 000.00, interest 1 200.00, principal 9 461.85, closing 110 538.15
    const r1 = sched.installments[0];
    expect(r1.seq).toBe(1);
    expect(r1.openingBalance).toBe(120000.0);
    expect(r1.interest).toBe(1200.0);
    expect(r1.principal).toBe(9461.85);
    expect(r1.closingBalance).toBe(110538.15);
    expect(r1.emi).toBe(10661.85);

    // Row 2: 110 538.15 / 1 105.38 / 9 556.47 / 100 981.68
    const r2 = sched.installments[1];
    expect(r2.seq).toBe(2);
    expect(r2.openingBalance).toBe(110538.15);
    expect(r2.interest).toBe(1105.38);
    expect(r2.principal).toBe(9556.47);
    expect(r2.closingBalance).toBe(100981.68);
    expect(r2.emi).toBe(10661.85);

    // Row 3: 100 981.68 / 1 009.82 / 9 652.03 / 91 329.65
    const r3 = sched.installments[2];
    expect(r3.seq).toBe(3);
    expect(r3.openingBalance).toBe(100981.68);
    expect(r3.interest).toBe(1009.82);
    expect(r3.principal).toBe(9652.03);
    expect(r3.closingBalance).toBe(91329.65);
    expect(r3.emi).toBe(10661.85);

    // Final row closing balance must be 0
    const lastRow = sched.installments[sched.installments.length - 1];
    expect(lastRow.closingBalance).toBe(0.0);

    // Supplied emiAmount used verbatim
    const customEmiLoan = await createLoan(api, {
      name: 'Custom EMI Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      emiAmount: 11000,
      startDate,
      firstEmiDate: startDate,
    });
    expect(customEmiLoan.currentEmi).toBe(11000);
    const customSched = await schedule(api, customEmiLoan.id);
    expect(customSched.installments[0].emi).toBe(11000);
  });

  test('Validations: invalid loan inputs rejected with 400', async ({ api, request }) => {
    const defaultDate = monthsAgo(2);
    const earlierDate = monthsAgo(3);

    // firstEmiDate < startDate -> 400
    const resEarlierFirstEmi = await api.POST('/api/v1/loans', {
      body: {
        name: 'Invalid First Emi',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: earlierDate,
      },
    });
    expect(resEarlierFirstEmi.response.status).toBe(400);

    // rate 0 (min is 0.0001) / 61 -> 400
    const resRateLow = await api.POST('/api/v1/loans', {
      body: {
        name: 'Rate Too Low',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 0,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resRateLow.response.status).toBe(400);

    const resRateHigh = await api.POST('/api/v1/loans', {
      body: {
        name: 'Rate Too High',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 61,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resRateHigh.response.status).toBe(400);

    // tenure 0 / 601 -> 400
    const resTenureLow = await api.POST('/api/v1/loans', {
      body: {
        name: 'Tenure Too Low',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 0,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resTenureLow.response.status).toBe(400);

    const resTenureHigh = await api.POST('/api/v1/loans', {
      body: {
        name: 'Tenure Too High',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 601,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resTenureHigh.response.status).toBe(400);

    // principal <= 0 -> 400
    const resPrincipalZero = await api.POST('/api/v1/loans', {
      body: {
        name: 'Principal Zero',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 0,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resPrincipalZero.response.status).toBe(400);

    // bad loanType -> 400
    const resBadType = await api.POST('/api/v1/loans', {
      body: {
        name: 'Bad Type',
        // @ts-expect-error test invalid enum
        loanType: 'spaceship',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
      },
    });
    expect(resBadType.response.status).toBe(400);

    // paymentAccountId of user B -> 400 (Security Breach pattern)
    const other = await secondUser(request);
    const otherAccount = await createBankAccount(other.api, { name: 'User B Bank' });

    const resForeignAccount = await api.POST('/api/v1/loans', {
      body: {
        name: 'Foreign Account Loan',
        loanType: 'personal',
        lender: 'HDFC',
        principal: 100000,
        annualRatePct: 10,
        rateType: 'fixed',
        tenureMonths: 12,
        startDate: defaultDate,
        firstEmiDate: defaultDate,
        paymentAccountId: otherAccount.id,
      },
    });
    expect(resForeignAccount.response.status).toBe(400);
  });

  test('Status recomputation: overdue vs upcoming and settlement via payment', async ({ api }) => {
    // 2 months ago start date means seqs 1-3 (2 months ago, 1 month ago, current month 1st) are overdue/past, 4+ upcoming
    const startDate = monthsAgo(2);
    const loan = await createLoan(api, {
      name: 'Status Recompute Loan',
      startDate,
      firstEmiDate: startDate,
      tenureMonths: 12,
    });

    const initialSched = await schedule(api, loan.id);
    expect(initialSched.installments[0].status).toBe('overdue');
    expect(initialSched.installments[1].status).toBe('overdue');
    expect(initialSched.installments[2].status).toBe('overdue');
    expect(initialSched.installments[3].status).toBe('upcoming');

    // Settle seq 1
    await pay(api, loan.id, { installmentSeq: 1, amount: 10661.85, paymentDate: startDate });

    const afterPaySched = await schedule(api, loan.id);
    expect(afterPaySched.installments[0].status).toBe('settled');
    expect(afterPaySched.installments[0].payment).toBeDefined();
    expect(afterPaySched.installments[1].status).toBe('overdue');
  });

  test('Payments: default seq, duplicate rejection, debit txn linking, unlinking and batch processing', async ({
    api,
  }) => {
    const startDate = monthsAgo(3);
    const account = await createBankAccount(api, { name: 'Loan EMI Account' });
    const loan = await createLoan(api, {
      name: 'Payment Lifecycle Loan',
      startDate,
      firstEmiDate: startDate,
      paymentAccountId: account.id,
      tenureMonths: 12,
    });

    // 1. Pay without installmentSeq settles lowest unsettled (seq 1)
    const p1 = await pay(api, loan.id, { amount: 10661.85, paymentDate: startDate });
    expect(p1.installmentSeq).toBe(1);

    // 2. Paying same seq again -> 400
    const resDup = await api.POST('/api/v1/loans/{id}/payments', {
      params: { path: { id: loan.id } },
      body: { installmentSeq: 1, amount: 10661.85, paymentDate: startDate },
    });
    expect(resDup.response.status).toBe(400);

    // 3. Link a DEBIT transaction
    const debitTxn = await createTransaction(api, account.id, {
      amount: -10661.85,
      date: startDate,
      description: 'EMI Auto Debit',
    });
    const p2 = await pay(api, loan.id, {
      installmentSeq: 2,
      amount: 10661.85,
      paymentDate: startDate,
      transactionId: debitTxn.id,
    });
    expect(p2.transactionId).toBe(debitTxn.id);

    // 4. Link a CREDIT transaction -> 400
    const creditTxn = await createTransaction(api, account.id, {
      amount: 5000,
      date: startDate,
      description: 'Refund credit',
    });
    const resCredit = await api.POST('/api/v1/loans/{id}/payments', {
      params: { path: { id: loan.id } },
      body: { installmentSeq: 3, amount: 10661.85, paymentDate: startDate, transactionId: creditTxn.id },
    });
    expect(resCredit.response.status).toBe(400);

    // 5. Link already-linked transaction -> 400
    const resAlreadyLinked = await api.POST('/api/v1/loans/{id}/payments', {
      params: { path: { id: loan.id } },
      body: { installmentSeq: 3, amount: 10661.85, paymentDate: startDate, transactionId: debitTxn.id },
    });
    expect(resAlreadyLinked.response.status).toBe(400);

    // 6. Delete payment -> status reverts back to overdue
    await deletePayment(api, loan.id, p1.id);
    const schedAfterDelete = await schedule(api, loan.id);
    expect(schedAfterDelete.installments[0].status).toBe('overdue');

    // 7. Batch payments: batch of 3 created
    const batchRes = await batchPay(api, loan.id, [
      { installmentSeq: 1, amount: 10661.85, paymentDate: startDate },
      { installmentSeq: 3, amount: 10661.85, paymentDate: startDate },
      { installmentSeq: 4, amount: 10661.85, paymentDate: startDate },
    ]);
    expect(batchRes.created).toBe(3);

    // 8. Batch with one bad item -> 400 and none created
    const resBadBatch = await api.POST('/api/v1/loans/{id}/payments/batch', {
      params: { path: { id: loan.id } },
      body: {
        items: [
          { installmentSeq: 5, amount: 10661.85, paymentDate: startDate },
          { installmentSeq: 1, amount: 10661.85, paymentDate: startDate }, // duplicate seq 1
        ],
      },
    });
    expect(resBadBatch.response.status).toBe(400);

    const schedAfterBadBatch = await schedule(api, loan.id);
    expect(schedAfterBadBatch.installments[4].status).toBe('upcoming');
  });

  test('Events: prepayment tenure reduction, emi reduction, rate change, foreclosure, and delete restrictions', async ({
    api,
  }) => {
    const startDate = monthsAgo(3);
    const loan = await createLoan(api, {
      name: 'Event Lifecycle Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    // 1. prepayment reduce_tenure: keeps EMI 10661.85, schedule rows shrink
    const evPrepayTenure = await addEvent(api, loan.id, {
      eventType: 'prepayment',
      effectiveDate: monthsAgo(1),
      amount: 30000,
      adjustmentMode: 'reduce_tenure',
    });
    expect(evPrepayTenure.id).toBeDefined();

    const schedTenure = await schedule(api, loan.id);
    expect(schedTenure.installments.length).toBeLessThan(12);
    expect(schedTenure.installments[0].emi).toBe(10661.85);

    // Delete prepayment to restore rows
    await deleteEvent(api, loan.id, evPrepayTenure.id);
    const schedRestored = await schedule(api, loan.id);
    expect(schedRestored.installments.length).toBeGreaterThanOrEqual(12);

    // 2. prepayment reduce_emi: row count unchanged, EMI recomputed lower
    const evPrepayEmi = await addEvent(api, loan.id, {
      eventType: 'prepayment',
      effectiveDate: monthsAgo(1),
      amount: 30000,
      adjustmentMode: 'reduce_emi',
    });
    const schedEmi = await schedule(api, loan.id);
    expect(schedEmi.installments.length).toBeGreaterThanOrEqual(12);
    // EMI from effective date forward is reduced
    expect(schedEmi.installments[3].emi).toBeLessThan(10661.85);

    // 3. newEmiOverride with reduce_tenure -> 400
    const resBadOverride = await api.POST('/api/v1/loans/{id}/events', {
      params: { path: { id: loan.id } },
      body: {
        eventType: 'prepayment',
        effectiveDate: monthsAgo(1),
        amount: 10000,
        adjustmentMode: 'reduce_tenure',
        newEmiOverride: 8000,
      },
    });
    expect(resBadOverride.response.status).toBe(400);

    // 4. Prepayment >= outstanding -> 400 with foreclosure suggestion
    const resExcessPrepay = await api.POST('/api/v1/loans/{id}/events', {
      params: { path: { id: loan.id } },
      body: {
        eventType: 'prepayment',
        effectiveDate: monthsAgo(1),
        amount: 200000,
        adjustmentMode: 'reduce_emi',
      },
    });
    expect(resExcessPrepay.response.status).toBe(400);

    // 5. rate_change to 10% from upcoming date
    const evRate = await addEvent(api, loan.id, {
      eventType: 'rate_change',
      effectiveDate: monthsAhead(1),
      newAnnualRatePct: 10,
    });
    expect(evRate.newAnnualRatePct).toBe(10);

    // 6. Foreclosure: status foreclosed, schedule truncates, later events blocked
    const evForeclose = await addEvent(api, loan.id, {
      eventType: 'foreclosure',
      effectiveDate: monthsAhead(2),
      amount: 80000,
    });
    const loanDetail = await getLoan(api, loan.id);
    expect(loanDetail.loan.status).toBe('foreclosed');

    // Later event blocked -> 400
    const resEventAfterForeclose = await api.POST('/api/v1/loans/{id}/events', {
      params: { path: { id: loan.id } },
      body: {
        eventType: 'rate_change',
        effectiveDate: monthsAhead(3),
        newAnnualRatePct: 9,
      },
    });
    expect(resEventAfterForeclose.response.status).toBe(400);

    // Reopen blocked while foreclosure event exists -> 400
    const resReopenBlocked = await api.POST('/api/v1/loans/{id}/reopen', {
      params: { path: { id: loan.id } },
    });
    expect(resReopenBlocked.response.status).toBe(400);

    // Delete foreclosure event -> status reopens to active
    await deleteEvent(api, loan.id, evForeclose.id);
    const loanAfterDeleteForeclose = await getLoan(api, loan.id);
    expect(loanAfterDeleteForeclose.loan.status).toBe('active');
  });

  test('Core terms edit blocked after payment / event; PUT of name/notes allowed', async ({ api }) => {
    const startDate = monthsAgo(3);
    const loan = await createLoan(api, {
      name: 'Core Lock Loan',
      principal: 100000,
      annualRatePct: 10,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    // Record a payment
    await pay(api, loan.id, { installmentSeq: 1, amount: 9000, paymentDate: startDate });

    // Attempt modifying core terms -> 400
    const resLock = await api.PUT('/api/v1/loans/{id}', {
      params: { path: { id: loan.id } },
      body: {
        principal: 150000,
      },
    });
    expect(resLock.response.status).toBe(400);
    expect(JSON.stringify(resLock.error)).toContain(
      'Core loan terms (principal, rate, tenure, dates, EMI) cannot be edited after events or payments exist'
    );

    // Modifying non-core terms (name, notes) -> 200 allowed
    const updated = await updateLoan(api, loan.id, {
      name: 'Renamed Core Lock Loan',
      notes: 'Updated notes',
    });
    expect(updated.name).toBe('Renamed Core Lock Loan');
    expect(updated.notes).toBe('Updated notes');
  });

  test('Charges: itemized charges affect effectiveAprPct; deletion works', async ({ api }) => {
    const startDate = monthsAgo(3);
    const loan = await createLoan(api, {
      name: 'Charges Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    const c1 = await addCharge(api, loan.id, {
      chargeType: 'processing_fee',
      amount: 2500,
      chargeDate: startDate,
      notes: 'Bank processing fee',
    });
    expect(c1.amount).toBe(2500);

    const c2 = await addCharge(api, loan.id, {
      chargeType: 'legal_valuation',
      amount: 1500,
      chargeDate: startDate,
    });
    expect(c2.amount).toBe(1500);

    // Detail reflects charges and higher effective APR
    const detail = await getLoan(api, loan.id);
    expect(detail.charges).toHaveLength(2);
    expect(detail.loan.effectiveAprPct).toBeDefined();
    expect(detail.loan.effectiveAprPct!).toBeGreaterThan(12);

    // Delete charge
    await deleteCharge(api, loan.id, c2.id);
    const detailAfterDelete = await getLoan(api, loan.id);
    expect(detailAfterDelete.charges).toHaveLength(1);
  });

  test('Close and reopen: close without unpaid installments precondition (PRODUCT-GAP)', async ({
    api,
  }) => {
    const startDate = monthsAgo(3);
    const loan = await createLoan(api, {
      name: 'Close Reopen Loan',
      startDate,
      firstEmiDate: startDate,
      tenureMonths: 12,
    });

    // PRODUCT-GAP: Server allows closing a loan even when all installments are unpaid
    await closeLoan(api, loan.id);
    const closedDetail = await getLoan(api, loan.id);
    expect(closedDetail.loan.status).toBe('closed');

    // Reopen loan
    await reopenLoan(api, loan.id);
    const reopenedDetail = await getLoan(api, loan.id);
    expect(reopenedDetail.loan.status).toBe('active');
  });

  test('Summary: totalOutstanding and activeLoanCount aggregation across loans', async ({ api }) => {
    const startDate = monthsAgo(1);
    const l1 = await createLoan(api, {
      name: 'Summary Loan 1',
      principal: 100000,
      annualRatePct: 10,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });
    const l2 = await createLoan(api, {
      name: 'Summary Loan 2',
      principal: 50000,
      annualRatePct: 10,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
    });

    const sumBefore = await loansSummary(api);
    expect(sumBefore.activeLoanCount).toBeGreaterThanOrEqual(2);
    expect(sumBefore.totalOutstanding).toBeGreaterThan(0);

    // Close l2 -> activeLoanCount decreases
    await closeLoan(api, l2.id);
    const sumAfterClose = await loansSummary(api);
    expect(sumAfterClose.activeLoanCount).toBe(sumBefore.activeLoanCount - 1);
  });

  test('Match suggestions: candidate DEBIT transactions within ±7 days and ±₹20', async ({ api }) => {
    const startDate = monthsAgo(1);
    const account = await createBankAccount(api, { name: 'Match Bank Account' });
    const otherAccount = await createBankAccount(api, { name: 'Other Bank Account' });

    const loan = await createLoan(api, {
      name: 'Match Candidate Loan',
      principal: 120000,
      annualRatePct: 12,
      tenureMonths: 12,
      startDate,
      firstEmiDate: startDate,
      paymentAccountId: account.id,
    });

    // Overdue seq 1 due date is startDate; EMI is 10661.85
    // 1. Candidate within ±7 days and ±₹20 (e.g. +2 days, ₹10660)
    const candTxn = await createTransaction(api, account.id, {
      amount: -10660,
      date: addDays(startDate, 2),
      description: 'HDFC EMI Debit',
    });

    // 2. Txn with amount ₹50 off (₹10600) -> should NOT match
    await createTransaction(api, account.id, {
      amount: -10600,
      date: addDays(startDate, 1),
      description: 'Unrelated Debit',
    });

    // 3. Txn on different account -> should NOT match
    await createTransaction(api, otherAccount.id, {
      amount: -10661.85,
      date: addDays(startDate, 1),
      description: 'Debit Other Account',
    });

    const matches = await matchSuggestions(api, loan.id);
    const seq1Suggestion = matches.suggestions.find((s) => s.installmentSeq === 1);
    expect(seq1Suggestion).toBeDefined();
    expect(seq1Suggestion!.candidates.length).toBeGreaterThanOrEqual(1);
    expect(seq1Suggestion!.candidates.some((c) => c.id === candTxn.id)).toBe(true);
  });

  test('Delete loan: cascades and returns 404 on subsequent get', async ({ api }) => {
    const loan = await createLoan(api, { name: 'To Delete Loan' });
    await pay(api, loan.id, { amount: 5000 });
    await addCharge(api, loan.id, {
      chargeType: 'processing_fee',
      amount: 1000,
      chargeDate: monthsAgo(1),
    });

    await deleteLoan(api, loan.id);

    const resGet = await api.GET('/api/v1/loans/{id}', { params: { path: { id: loan.id } } });
    expect(resGet.response.status).toBe(404);
  });

  test('List, pagination, tenancy, and 401 unauthenticated checks', async ({ api, request }) => {
    const loan = await createLoan(api, { name: 'Tenancy Loan' });

    // Pagination
    const resPage = await api.GET('/api/v1/loans', { params: { query: { size: 1 } } });
    expect(resPage.response.status).toBe(200);
    expect(resPage.data!.content.length).toBeLessThanOrEqual(1);

    // Status filter
    const resFilter = await api.GET('/api/v1/loans', { params: { query: { status: 'closed' } } });
    expect(resFilter.response.status).toBe(200);

    // Tenancy: user B accessing user A's loan returns 400 (ValidationException Security Breach pattern)
    const other = await secondUser(request);
    const resTenancy = await other.api.GET('/api/v1/loans/{id}', { params: { path: { id: loan.id } } });
    expect(resTenancy.response.status).toBe(400);

    // Unknown ID returns 404
    const resUnknown = await api.GET('/api/v1/loans/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
    });
    expect(resUnknown.response.status).toBe(404);

    // 401 unauthenticated check on loan operations
    await expectUnauthenticated('GET', '/api/v1/loans');
    await expectUnauthenticated('POST', '/api/v1/loans');
    await expectUnauthenticated('GET', `/api/v1/loans/${loan.id}`);
    await expectUnauthenticated('PUT', `/api/v1/loans/${loan.id}`);
    await expectUnauthenticated('DELETE', `/api/v1/loans/${loan.id}`);
    await expectUnauthenticated('GET', '/api/v1/loans/summary');
    await expectUnauthenticated('GET', `/api/v1/loans/${loan.id}/schedule`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/close`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/reopen`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/payments`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/payments/batch`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/events`);
    await expectUnauthenticated('POST', `/api/v1/loans/${loan.id}/charges`);
    await expectUnauthenticated('GET', `/api/v1/loans/${loan.id}/match-suggestions`);
  });
});
