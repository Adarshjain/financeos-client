import { createBankAccount } from '../fixtures/seed/accounts';
import {
  linkLendingTransaction,
  matchSuggestions,
  unlinkLendingTransaction,
} from '../fixtures/seed/lendings';
import {
  addDays,
  addLending,
  createCounterparty,
  createLoan,
  monthsAgo,
  pay,
  updateLending,
} from '../fixtures/seed/loans';
import { catalog } from '../fixtures/seed/reports';
import { createTransaction, findById } from '../fixtures/seed/transactions';
import { expectForeign, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Lending <-> Transaction Links API (@api)', () => {
  test('create linked lending: direction validation, embedded transaction, split bill, empty refs on unlinked txn', async ({
    api,
  }) => {
    const bank = await createBankAccount(api, { name: 'Lending Link Bank' });

    // 1. lent + DEBIT -> ok, embeds the transaction summary
    const debitTxn = await createTransaction(api, bank.id, {
      amount: -4000,
      description: 'Cash to Rahul',
    });
    const cpName = `Link Person ${Date.now()}`;
    const lentEntry = await addLending(api, {
      newCounterpartyName: cpName,
      direction: 'lent',
      amount: 4000,
      entryDate: monthsAgo(1),
      transactionId: debitTxn.id,
    });
    expect(lentEntry.transactionId).toBe(debitTxn.id);
    expect(lentEntry.transaction).toBeDefined();
    expect(lentEntry.transaction!.id).toBe(debitTxn.id);
    expect(lentEntry.transaction!.accountId).toBe(bank.id);
    expect(lentEntry.transaction!.date).toBe(debitTxn.date);
    expect(lentEntry.transaction!.signedAmount).toBe(-4000);

    // 2. lent + CREDIT -> 400
    const creditTxn = await createTransaction(api, bank.id, {
      amount: 2500,
      description: 'Refund In',
    });
    const resLentCredit = await api.POST('/api/v1/lendings', {
      body: {
        newCounterpartyName: `Bad Direction ${Date.now()}`,
        direction: 'lent',
        amount: 2500,
        entryDate: monthsAgo(1),
        transactionId: creditTxn.id,
      },
    });
    expect(resLentCredit.response.status).toBe(400);

    // 3. borrowed + CREDIT -> ok
    const borrowedEntry = await addLending(api, {
      counterpartyId: lentEntry.counterpartyId,
      direction: 'borrowed',
      amount: 2500,
      entryDate: monthsAgo(1),
      transactionId: creditTxn.id,
    });
    expect(borrowedEntry.transaction!.id).toBe(creditTxn.id);

    // 4. split bill: two lent entries sharing one DEBIT -> both 200, search shows 2 LENDING refs
    const splitTxn = await createTransaction(api, bank.id, {
      amount: -900,
      description: 'Dinner split',
    });
    const split1 = await addLending(api, {
      newCounterpartyName: `Split A ${Date.now()}`,
      direction: 'lent',
      amount: 300,
      entryDate: monthsAgo(1),
      transactionId: splitTxn.id,
    });
    const split2 = await addLending(api, {
      newCounterpartyName: `Split B ${Date.now()}`,
      direction: 'lent',
      amount: 300,
      entryDate: monthsAgo(1),
      transactionId: splitTxn.id,
    });
    expect(split1.transaction!.id).toBe(splitTxn.id);
    expect(split2.transaction!.id).toBe(splitTxn.id);

    const splitTxnAfter = await findById(api, splitTxn.id);
    expect(splitTxnAfter).toBeDefined();
    const lendingRefs = splitTxnAfter!.obligationRefs.filter((r) => r.kind === 'LENDING');
    expect(lendingRefs.length).toBe(2);
    expect(lendingRefs.map((r) => r.id).sort()).toEqual([split1.id, split2.id].sort());

    // 5. unlinked transaction has empty obligationRefs
    const plainTxn = await createTransaction(api, bank.id, {
      amount: -50,
      description: 'Plain unlinked txn',
    });
    const plainAfter = await findById(api, plainTxn.id);
    expect(plainAfter!.obligationRefs).toEqual([]);

    // 6. list and detail both carry `transaction`
    const listRes = await api.GET('/api/v1/lendings', {
      params: { query: { counterpartyId: lentEntry.counterpartyId, size: 10 } },
    });
    expect(listRes.response.status).toBe(200);
    const listedEntry = listRes.data!.content.find((e) => e.id === lentEntry.id);
    expect(listedEntry?.transaction?.id).toBe(debitTxn.id);

    const detailRes = await api.GET('/api/v1/lendings/{id}', {
      params: { path: { id: lentEntry.id } },
    });
    expect(detailRes.response.status).toBe(200);
    expect(detailRes.data?.transaction?.id).toBe(debitTxn.id);
  });

  test('update guards: direction change blocked while linked (notes-only ok); transaction sign flip blocked while linked (same-sign ok)', async ({
    api,
  }) => {
    const bank = await createBankAccount(api, { name: 'Guard Bank' });
    const debitTxn = await createTransaction(api, bank.id, {
      amount: -1200,
      description: 'Guard Debit',
    });
    const cp = await createCounterparty(api, { name: `Guard Person ${Date.now()}` });
    const entry = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 1200,
      entryDate: monthsAgo(1),
      transactionId: debitTxn.id,
    });

    // Direction change while linked -> 400 "Unlink the transaction"
    const resDirChange = await api.PUT('/api/v1/lendings/{id}', {
      params: { path: { id: entry.id } },
      body: { direction: 'borrowed' },
    });
    expect(resDirChange.response.status).toBe(400);
    expect(resDirChange.error?.message ?? '').toContain('Unlink the transaction');

    // Notes-only update while linked -> ok, direction/link untouched
    const notesUpdated = await updateLending(api, entry.id, { notes: 'Updated notes only' });
    expect(notesUpdated.notes).toBe('Updated notes only');
    expect(notesUpdated.direction).toBe('lent');
    expect(notesUpdated.transaction?.id).toBe(debitTxn.id);

    // Transaction sign flip while linked -> 400
    const resSignFlip = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: debitTxn.id } },
      body: { accountId: bank.id, amount: 1200, date: debitTxn.date, description: debitTxn.description ?? undefined },
    });
    expect(resSignFlip.response.status).toBe(400);
    expect(resSignFlip.error?.message ?? '').toContain('unlink it before changing its direction');

    // Same-sign update while linked -> ok
    const resSameSign = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: debitTxn.id } },
      body: { accountId: bank.id, amount: -1500, date: debitTxn.date, description: 'Guard Debit Updated' },
    });
    expect(resSameSign.response.status).toBe(200);
    expect(resSameSign.data?.amount).toBe(-1500);
  });

  test('unlink/relink lifecycle: idempotent unlink, no-op relink, relink to a new same-direction txn, opposite-direction relink rejected', async ({
    api,
  }) => {
    const bank = await createBankAccount(api, { name: 'Relink Bank' });
    const debitTxn1 = await createTransaction(api, bank.id, {
      amount: -700,
      description: 'Relink Debit 1',
    });
    const debitTxn2 = await createTransaction(api, bank.id, {
      amount: -700,
      description: 'Relink Debit 2',
    });
    const creditTxn = await createTransaction(api, bank.id, {
      amount: 700,
      description: 'Relink Credit',
    });
    const cp = await createCounterparty(api, { name: `Relink Person ${Date.now()}` });
    const entry = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 700,
      entryDate: monthsAgo(1),
      transactionId: debitTxn1.id,
    });

    // Unlink -> 204, detail shows transaction: null
    await unlinkLendingTransaction(api, entry.id);
    let detail = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: entry.id } } });
    expect(detail.response.status).toBe(200);
    expect(detail.data?.transaction ?? null).toBeNull();
    expect(detail.data?.transactionId ?? null).toBeNull();

    // Unlink again -> 204 idempotent
    await unlinkLendingTransaction(api, entry.id);

    // Relink -> 200
    const relinked = await linkLendingTransaction(api, entry.id, debitTxn2.id);
    expect(relinked.transaction?.id).toBe(debitTxn2.id);

    // Relink same id -> 200 no-op
    const relinkedSame = await linkLendingTransaction(api, entry.id, debitTxn2.id);
    expect(relinkedSame.transaction?.id).toBe(debitTxn2.id);

    // Relink a CREDIT onto a 'lent' entry -> 400
    const resBadRelink = await api.PUT('/api/v1/lendings/{id}/transaction', {
      params: { path: { id: entry.id } },
      body: { transactionId: creditTxn.id },
    });
    expect(resBadRelink.response.status).toBe(400);

    detail = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: entry.id } } });
    expect(detail.data?.transaction?.id).toBe(debitTxn2.id);
  });

  test.describe('merge with obligation refs', () => {
    test('merge re-points the obligation ref onto the kept transaction', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Merge Repoint Bank' });
      const keepTxn = await createTransaction(api, bank.id, {
        amount: -3000,
        description: 'Keep Txn',
      });
      const deleteTxn = await createTransaction(api, bank.id, {
        amount: -3000,
        description: 'Delete Txn',
      });
      const cp = await createCounterparty(api, { name: `Merge Repoint Person ${Date.now()}` });
      const entry = await addLending(api, {
        counterpartyId: cp.id,
        direction: 'lent',
        amount: 3000,
        entryDate: monthsAgo(1),
        transactionId: deleteTxn.id,
      });

      const mergeRes = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: keepTxn.id, deleteId: deleteTxn.id },
      });
      expect(mergeRes.response.status).toBe(200);
      expect(mergeRes.data?.keptId).toBe(keepTxn.id);

      const entryAfter = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: entry.id } } });
      expect(entryAfter.data?.transaction?.id).toBe(keepTxn.id);

      const keptAfter = await findById(api, keepTxn.id);
      expect(
        keptAfter?.obligationRefs.some((r) => r.kind === 'LENDING' && r.id === entry.id)
      ).toBe(true);

      const deletedGone = await findById(api, deleteTxn.id);
      expect(deletedGone).toBeNull();
    });

    test('merge rejected: kept/deleted have opposite direction and deleted carries a ref', async ({
      api,
    }) => {
      const bank = await createBankAccount(api, { name: 'Merge Opposite Bank' });
      const keepTxn = await createTransaction(api, bank.id, {
        amount: 2000,
        description: 'Keep Credit',
      });
      const deleteTxn = await createTransaction(api, bank.id, {
        amount: -2000,
        description: 'Delete Debit Linked',
      });
      const cp = await createCounterparty(api, { name: `Merge Opposite Person ${Date.now()}` });
      await addLending(api, {
        counterpartyId: cp.id,
        direction: 'lent',
        amount: 2000,
        entryDate: monthsAgo(1),
        transactionId: deleteTxn.id,
      });

      const res = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: keepTxn.id, deleteId: deleteTxn.id },
      });
      expect(res.response.status).toBe(400);
      expect((res.error?.message ?? '').toLowerCase()).toContain('opposite direction');
    });

    test('merge rejected: both transactions referenced with a loan row involved', async ({ api }) => {
      const bank = await createBankAccount(api, { name: 'Merge Loan Involved Bank' });
      const keepTxn = await createTransaction(api, bank.id, {
        amount: -5000,
        description: 'Keep EMI Txn',
      });
      const deleteTxn = await createTransaction(api, bank.id, {
        amount: -5000,
        description: 'Delete Lending Txn',
      });

      const loan = await createLoan(api, { name: `Merge Loan ${Date.now()}` });
      await pay(api, loan.id, { transactionId: keepTxn.id, amount: 5000 });

      const cp = await createCounterparty(api, { name: `Merge Loan Person ${Date.now()}` });
      await addLending(api, {
        counterpartyId: cp.id,
        direction: 'lent',
        amount: 5000,
        entryDate: monthsAgo(1),
        transactionId: deleteTxn.id,
      });

      const res = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: keepTxn.id, deleteId: deleteTxn.id },
      });
      expect(res.response.status).toBe(400);
      expect((res.error?.message ?? '').toLowerCase()).toContain('unlink one before merging');
    });
  });

  test('deleting a linked transaction leaves the lending entry unlinked', async ({ api }) => {
    const bank = await createBankAccount(api, { name: 'Delete Linked Bank' });
    const txn = await createTransaction(api, bank.id, {
      amount: -450,
      description: 'To Be Deleted Linked',
    });
    const cp = await createCounterparty(api, { name: `Delete Linked Person ${Date.now()}` });
    const entry = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 450,
      entryDate: monthsAgo(1),
      transactionId: txn.id,
    });

    const delRes = await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: txn.id } } });
    expect(delRes.response.status).toBe(204);

    const detail = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: entry.id } } });
    expect(detail.response.status).toBe(200);
    expect(detail.data?.transaction ?? null).toBeNull();
    expect(detail.data?.transactionId ?? null).toBeNull();
  });

  test('loan/lending exclusivity in both directions; loan payment obligation ref carries the EMI label', async ({
    api,
  }) => {
    const bank = await createBankAccount(api, { name: 'Exclusivity Bank' });
    const loanTxn = await createTransaction(api, bank.id, {
      amount: -6000,
      description: 'Loan Paid Txn',
    });
    const loan = await createLoan(api, { name: `Exclusivity Loan ${Date.now()}` });
    const payment = await pay(api, loan.id, { transactionId: loanTxn.id, amount: 6000 });

    // Lending on a loan-paid txn -> 400 "already linked to a loan record"
    const resLendingOnLoanTxn = await api.POST('/api/v1/lendings', {
      body: {
        newCounterpartyName: `Exclusivity Person ${Date.now()}`,
        direction: 'lent',
        amount: 6000,
        entryDate: monthsAgo(1),
        transactionId: loanTxn.id,
      },
    });
    expect(resLendingOnLoanTxn.response.status).toBe(400);
    expect(resLendingOnLoanTxn.error?.message ?? '').toContain('already linked to a loan record');

    // obligationRefs on that transaction show the LOAN_PAYMENT ref with the EMI label
    const loanTxnAfter = await findById(api, loanTxn.id);
    expect(loanTxnAfter?.obligationRefs.length).toBe(1);
    expect(loanTxnAfter?.obligationRefs[0].kind).toBe('LOAN_PAYMENT');
    expect(loanTxnAfter?.obligationRefs[0].label).toBe(`EMI #${payment.installmentSeq} · ${loan.name}`);

    // Loan payment on a lending-linked txn -> 400 "already linked to a loan or lending record"
    const lendingTxn = await createTransaction(api, bank.id, {
      amount: -3000,
      description: 'Lending Linked Txn',
    });
    const cp = await createCounterparty(api, { name: `Exclusivity Person B ${Date.now()}` });
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 3000,
      entryDate: monthsAgo(1),
      transactionId: lendingTxn.id,
    });

    const resPaymentOnLendingTxn = await api.POST('/api/v1/loans/{id}/payments', {
      params: { path: { id: loan.id } },
      body: { paymentDate: monthsAgo(1), amount: 3000, transactionId: lendingTxn.id },
    });
    expect(resPaymentOnLendingTxn.response.status).toBe(400);
    expect(resPaymentOnLendingTxn.error?.message ?? '').toContain(
      'already linked to a loan or lending record'
    );
  });

  test('match-suggestions: tolerance/window filtering, exclusions, and confirming removes the suggestion', async ({
    api,
  }) => {
    const bank = await createBankAccount(api, { name: 'Match Bank' });
    const cp = await createCounterparty(api, { name: `Match Person ${Date.now()}` });
    const entryDate = monthsAgo(1);

    const unlinkedLent = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 1000,
      entryDate,
    });

    // In tolerance (+-20 amount) and in window (+-7 days)
    const goodCandidate = await createTransaction(api, bank.id, {
      amount: -1010,
      date: addDays(entryDate, 3),
      description: 'Good Match Candidate',
    });

    // Out of amount tolerance (diff 50 > 20)
    const badAmountCandidate = await createTransaction(api, bank.id, {
      amount: -1050,
      date: entryDate,
      description: 'Bad Amount Candidate',
    });

    // Out of date window (10 days > 7)
    const badDateCandidate = await createTransaction(api, bank.id, {
      amount: -1000,
      date: addDays(entryDate, 10),
      description: 'Bad Date Candidate',
    });

    // Already linked to a different lending entry -> excluded even though in tolerance/window
    const otherCp = await createCounterparty(api, { name: `Match Other Person ${Date.now()}` });
    const alreadyLinkedTxn = await createTransaction(api, bank.id, {
      amount: -1005,
      date: entryDate,
      description: 'Already Linked Candidate',
    });
    await addLending(api, {
      counterpartyId: otherCp.id,
      direction: 'lent',
      amount: 1005,
      entryDate,
      transactionId: alreadyLinkedTxn.id,
    });

    // A linked entry should not itself be listed as a suggestion
    const linkedEntryTxn = await createTransaction(api, bank.id, {
      amount: -1000,
      date: entryDate,
      description: 'Linked Entry Txn',
    });
    const linkedEntry = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 1000,
      entryDate,
      transactionId: linkedEntryTxn.id,
    });

    const suggestions1 = await matchSuggestions(api, cp.id);
    expect(suggestions1.suggestions.some((s) => s.lendingId === linkedEntry.id)).toBe(false);

    const suggestionForEntry = suggestions1.suggestions.find((s) => s.lendingId === unlinkedLent.id);
    expect(suggestionForEntry).toBeDefined();
    const candidateIds = suggestionForEntry!.candidates.map((c) => c.id);
    expect(candidateIds).toContain(goodCandidate.id);
    expect(candidateIds).not.toContain(badAmountCandidate.id);
    expect(candidateIds).not.toContain(badDateCandidate.id);
    expect(candidateIds).not.toContain(alreadyLinkedTxn.id);

    // Confirming via PUT .../transaction removes the entry from the next call
    await linkLendingTransaction(api, unlinkedLent.id, goodCandidate.id);
    const suggestions2 = await matchSuggestions(api, cp.id);
    expect(suggestions2.suggestions.some((s) => s.lendingId === unlinkedLent.id)).toBe(false);
  });

  test('report datasource catalog exposes lending-link fields', async ({ api }) => {
    const data = await catalog(api);

    const txnDs = data.datasources.find((d) => d.name === 'transactions')!;
    expect(txnDs).toBeDefined();
    const isLendingLeg = txnDs.fields.find((f) => f.name === 'isLendingLeg');
    const isLoanLeg = txnDs.fields.find((f) => f.name === 'isLoanLeg');
    expect(isLendingLeg?.type).toBe('boolean');
    expect(isLoanLeg?.type).toBe('boolean');

    const lendingsDs = data.datasources.find((d) => d.name === 'lendings')!;
    expect(lendingsDs).toBeDefined();
    const isLinked = lendingsDs.fields.find((f) => f.name === 'isLinked');
    const transactionId = lendingsDs.fields.find((f) => f.name === 'transactionId');
    const transactionAccount = lendingsDs.fields.find((f) => f.name === 'transactionAccount');
    expect(isLinked?.type).toBe('boolean');
    expect(transactionId).toBeDefined();
    expect(transactionAccount).toBeDefined();
  });

  test('tenancy: second user is rejected on link/unlink and match-suggestions for first user data', async ({
    api,
    request,
  }) => {
    const bank = await createBankAccount(api, { name: 'Tenancy Lending Bank' });
    const txn = await createTransaction(api, bank.id, {
      amount: -800,
      description: 'Tenancy Debit',
    });
    const cp = await createCounterparty(api, { name: `Tenancy Lending Person ${Date.now()}` });
    const entry = await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 800,
      entryDate: monthsAgo(1),
      transactionId: txn.id,
    });

    const other = await secondUser(request);
    const otherBank = await createBankAccount(other.api, { name: 'Other User Bank' });
    const otherTxn = await createTransaction(other.api, otherBank.id, { amount: -800 });

    await expectForeign(other.api, 'PUT', `/api/v1/lendings/${entry.id}/transaction`, {
      transactionId: otherTxn.id,
    });
    await expectForeign(other.api, 'DELETE', `/api/v1/lendings/${entry.id}/transaction`);
    await expectForeign(other.api, 'GET', `/api/v1/counterparties/${cp.id}/match-suggestions`);
  });
});
