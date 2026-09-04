import {
  addLending,
  createCounterparty,
  createLoan,
  deleteCounterparty,
  deleteLending,
  getCounterparty,
  loansSummary,
  monthsAgo,
  monthsAhead,
  obligations,
  updateCounterparty,
  updateLending,
} from '../fixtures/seed/loans';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Lendings and Counterparties API (@api)', () => {
  test('Counterparty CRUD: create, duplicate name, rename collision, update, and get list', async ({
    api,
  }) => {
    const cpName = `Arun Patel ${Date.now()}`;
    const cp = await createCounterparty(api, {
      name: cpName,
      notes: 'Friend from college',
    });
    expect(cp.id).toBeDefined();
    expect(cp.name).toBe(cpName);
    expect(cp.totalLent).toBe(0);
    expect(cp.totalBorrowed).toBe(0);
    expect(cp.netPosition).toBe(0);
    expect(cp.entryCount).toBe(0);

    // Duplicate name -> 400
    const resDup = await api.POST('/api/v1/counterparties', {
      body: { name: cpName },
    });
    expect(resDup.response.status).toBe(400);

    // Create another person to test rename collision
    const otherName = `Bhavna Shah ${Date.now()}`;
    const cp2 = await createCounterparty(api, { name: otherName });

    // Rename collision with existing counterparty name -> 400
    const resCollision = await api.PUT('/api/v1/counterparties/{id}', {
      params: { path: { id: cp2.id } },
      body: { name: cpName },
    });
    expect(resCollision.response.status).toBe(400);

    // Valid update
    const updated = await updateCounterparty(api, cp.id, {
      name: `${cpName} (Updated)`,
      notes: 'Updated notes',
    });
    expect(updated.name).toBe(`${cpName} (Updated)`);
    expect(updated.notes).toBe('Updated notes');

    // Get counterparty via list
    const found = await getCounterparty(api, cp.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe(`${cpName} (Updated)`);
  });

  test('Lending Entries: newCounterpartyName reuse, validation, net calculation, PUT, and DELETE', async ({
    api,
  }) => {
    const inlineName = `Inline Person ${Date.now()}`;

    // 1. Neither counterpartyId nor newCounterpartyName -> 400
    const resNeither = await api.POST('/api/v1/lendings', {
      body: {
        direction: 'lent',
        amount: 10000,
        entryDate: monthsAgo(1),
      },
    });
    expect(resNeither.response.status).toBe(400);

    // 2. Both counterpartyId and newCounterpartyName -> 400
    const dummyCp = await createCounterparty(api);
    const resBoth = await api.POST('/api/v1/lendings', {
      body: {
        counterpartyId: dummyCp.id,
        newCounterpartyName: 'Duplicate Spec',
        direction: 'lent',
        amount: 10000,
        entryDate: monthsAgo(1),
      },
    });
    expect(resBoth.response.status).toBe(400);

    // 3. newCounterpartyName creates counterparty on first entry
    const entry1 = await addLending(api, {
      newCounterpartyName: inlineName,
      direction: 'lent',
      amount: 50000,
      entryDate: monthsAgo(2),
      notes: 'Lent for emergency',
    });
    expect(entry1.counterpartyName).toBe(inlineName);
    const cpId = entry1.counterpartyId;

    // 4. Same newCounterpartyName reuses existing counterparty on second entry
    const entry2 = await addLending(api, {
      newCounterpartyName: inlineName,
      direction: 'borrowed',
      amount: 20000,
      entryDate: monthsAgo(1),
      notes: 'Partial repayment received',
    });
    expect(entry2.counterpartyId).toBe(cpId);

    // 5. Verify Counterparty aggregated metrics: Lent 50k - Borrowed 20k = Net +30k
    const cp = await getCounterparty(api, cpId);
    expect(cp).toBeDefined();
    expect(cp!.totalLent).toBe(50000);
    expect(cp!.totalBorrowed).toBe(20000);
    expect(cp!.netPosition).toBe(30000);
    expect(cp!.entryCount).toBe(2);

    // 6. Get single lending entry
    const resGetEntry = await api.GET('/api/v1/lendings/{id}', {
      params: { path: { id: entry2.id } },
    });
    expect(resGetEntry.response.status).toBe(200);
    expect(resGetEntry.data!.amount).toBe(20000);

    // 7. PUT update lending entry (change amount to 25 000)
    const updatedEntry = await updateLending(api, entry2.id, {
      amount: 25000,
      notes: 'Corrected repayment amount',
    });
    expect(updatedEntry.amount).toBe(25000);

    const cpAfterPut = await getCounterparty(api, cpId);
    expect(cpAfterPut!.totalBorrowed).toBe(25000);
    expect(cpAfterPut!.netPosition).toBe(25000);

    // 8. DELETE entry updates net position
    await deleteLending(api, entry2.id);
    const cpAfterDelete = await getCounterparty(api, cpId);
    expect(cpAfterDelete!.entryCount).toBe(1);
    expect(cpAfterDelete!.netPosition).toBe(50000);
  });

  test('Summary netting: lentOutstanding, borrowedOutstanding, and netReceivable aggregate per counterparty', async ({
    api,
  }) => {
    // Person A: Net +30 000 (Lent 50 000, Borrowed 20 000)
    const cpA = await createCounterparty(api, { name: `Net Positive ${Date.now()}` });
    await addLending(api, { counterpartyId: cpA.id, direction: 'lent', amount: 50000, entryDate: monthsAgo(1) });
    await addLending(api, { counterpartyId: cpA.id, direction: 'borrowed', amount: 20000, entryDate: monthsAgo(1) });

    // Person B: Net -5 000 (Borrowed 5 000)
    const cpB = await createCounterparty(api, { name: `Net Negative ${Date.now()}` });
    await addLending(api, { counterpartyId: cpB.id, direction: 'borrowed', amount: 5000, entryDate: monthsAgo(1) });

    const summary = await loansSummary(api);
    expect(summary.lentOutstanding).toBeGreaterThanOrEqual(30000);
    expect(summary.borrowedOutstanding).toBeGreaterThanOrEqual(5000);
    expect(summary.netReceivable).toBe(summary.lentOutstanding - summary.borrowedOutstanding);
  });

  test('Obligations: includes loan installments and net counterparty positions; window clamping', async ({
    api,
  }) => {
    const returnDate = monthsAhead(1);
    const cp = await createCounterparty(api, { name: `Obligation Person ${Date.now()}` });
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 15000,
      entryDate: monthsAgo(1),
      expectedReturnDate: returnDate,
    });

    const loanStartDate = monthsAgo(2);
    await createLoan(api, {
      name: 'Obligations Loan',
      startDate: loanStartDate,
      firstEmiDate: loanStartDate,
      tenureMonths: 12,
    });

    const ob = await obligations(api, 3);
    expect(ob.items.length).toBeGreaterThan(0);

    // Overdue items come before upcoming items
    let seenUpcoming = false;
    for (const item of ob.items) {
      if (item.status === 'upcoming') {
        seenUpcoming = true;
      }
      if (seenUpcoming) {
        expect(item.status).not.toBe('overdue');
      }
    }

    // Counterparty obligation item has lendingId = null and amount = netPosition
    const cpObligation = ob.items.find((i) => i.counterpartyId === cp.id);
    expect(cpObligation).toBeDefined();
    expect(cpObligation!.amount).toBe(15000);
    expect(cpObligation!.lendingId).toBeNull();
    expect(cpObligation!.type).toBe('lending_due');
    expect(cpObligation!.direction).toBe('lent');

    // Clamping checks: months=0 clamped to 1, months=13 clamped to 12
    const obClampMin = await api.GET('/api/v1/obligations/upcoming', { params: { query: { months: 0 } } });
    expect(obClampMin.response.status).toBe(200);

    const obClampMax = await api.GET('/api/v1/obligations/upcoming', { params: { query: { months: 13 } } });
    expect(obClampMax.response.status).toBe(200);
  });

  test('Cascade delete: deleting counterparty deletes all its ledger entries', async ({ api }) => {
    const cp = await createCounterparty(api, { name: `Cascade Person ${Date.now()}` });
    const e1 = await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 10000, entryDate: monthsAgo(1) });
    const e2 = await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 4000, entryDate: monthsAgo(1) });

    // Delete counterparty -> 204
    await deleteCounterparty(api, cp.id);

    // Counterparty not in list
    const foundCp = await getCounterparty(api, cp.id);
    expect(foundCp).toBeUndefined();

    // Entries for counterparty are gone
    const resEntries = await api.GET('/api/v1/lendings', { params: { query: { counterpartyId: cp.id } } });
    expect(resEntries.response.status).toBe(200);
    expect(resEntries.data!.content).toHaveLength(0);

    // Individual entry GET returns 404
    const resGetE1 = await api.GET('/api/v1/lendings/{id}', { params: { path: { id: e1.id } } });
    expect(resGetE1.response.status).toBe(404);
  });

  test('Pagination, tenancy, and 401 unauthenticated checks', async ({ api, request }) => {
    const cp = await createCounterparty(api, { name: `Tenancy Person ${Date.now()}` });
    const lending = await addLending(api, { counterpartyId: cp.id, direction: 'lent', amount: 5000, entryDate: monthsAgo(1) });

    // Pagination
    const resCpPage = await api.GET('/api/v1/counterparties', { params: { query: { size: 1 } } });
    expect(resCpPage.response.status).toBe(200);
    expect(resCpPage.data!.content.length).toBeLessThanOrEqual(1);

    const resLendingPage = await api.GET('/api/v1/lendings', { params: { query: { size: 1 } } });
    expect(resLendingPage.response.status).toBe(200);
    expect(resLendingPage.data!.content.length).toBeLessThanOrEqual(1);

    // Tenancy: user B accessing user A's counterparty / lending returns 400 (Security breach pattern)
    const other = await secondUser(request);
    const resOtherCp = await other.api.PUT('/api/v1/counterparties/{id}', {
      params: { path: { id: cp.id } },
      body: { name: 'Attempted Renaming' },
    });
    expect(resOtherCp.response.status).toBe(400);

    const resOtherLending = await other.api.GET('/api/v1/lendings/{id}', { params: { path: { id: lending.id } } });
    expect(resOtherLending.response.status).toBe(400);

    // Unknown IDs return 404
    const resUnknownCp = await api.PUT('/api/v1/counterparties/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
      body: { name: 'Non Existent' },
    });
    expect(resUnknownCp.response.status).toBe(404);

    const resUnknownLending = await api.GET('/api/v1/lendings/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
    });
    expect(resUnknownLending.response.status).toBe(404);

    // 401 unauthenticated checks
    await expectUnauthenticated('GET', '/api/v1/counterparties');
    await expectUnauthenticated('POST', '/api/v1/counterparties');
    await expectUnauthenticated('PUT', `/api/v1/counterparties/${cp.id}`);
    await expectUnauthenticated('DELETE', `/api/v1/counterparties/${cp.id}`);
    await expectUnauthenticated('GET', '/api/v1/lendings');
    await expectUnauthenticated('POST', '/api/v1/lendings');
    await expectUnauthenticated('GET', `/api/v1/lendings/${lending.id}`);
    await expectUnauthenticated('PUT', `/api/v1/lendings/${lending.id}`);
    await expectUnauthenticated('DELETE', `/api/v1/lendings/${lending.id}`);
    await expectUnauthenticated('GET', '/api/v1/obligations/upcoming');
  });
});
