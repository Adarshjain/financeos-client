import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  confirmDividendMatches,
  createBroker,
  createDividend,
  dividendReceiptSummary,
  dividendReconciliation,
  type DividendResponse,
  generateIsin,
  generateYahooSymbol,
  linkDividendTransaction,
  listDividends,
  type ReceiptStatus,
  resolveInstrument,
  setDividendReceiptStatus,
  trade,
  uniqueSeedSuffix,
  unlinkDividendTransaction,
  unrecordedDividendCredits,
} from '../fixtures/seed/investments';
import { addLending, createCounterparty, monthsAgo } from '../fixtures/seed/loans';
import { createTransaction, findById, todayString } from '../fixtures/seed/transactions';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

interface Candidate {
  transaction: { id: string; signedAmount?: number };
  tier: 'EXACT' | 'NET_OF_TDS' | 'FUZZY';
  score: number;
  reasons: string[];
  impliedTds?: number | null;
  variance?: number | null;
}
interface ReconItem {
  dividend: DividendResponse;
  candidates: Candidate[];
}
interface Recon {
  items: ReconItem[];
  coverageEnd?: string | null;
  unresolvedCount: number;
  withCandidates: number;
}
interface Bucket {
  status: ReceiptStatus;
  count: number;
  expectedNet: number;
  receivedAmount: number;
}
interface Unrecorded {
  items: Array<{
    transaction: { id: string };
    holdingHints: Array<{
      holdingId: string;
      brokerAccountId: string;
      brokerName: string;
      instrumentId: string;
      instrumentName: string;
      symbol: string;
      nameScore: number;
    }>;
  }>;
  from: string;
  to: string;
}

const ALL_STATUSES: ReceiptStatus[] = [
  'received',
  'received_untracked',
  'not_received',
  'awaiting',
  'overdue',
  'unverifiable',
];

/** A broker + a uniquely named instrument + a buy, ready to receive dividends. */
async function seedHolding(api: ApiClient, broker?: { id: string }) {
  const b = broker ?? (await createBroker(api));
  const yahoo = generateYahooSymbol('RCP');
  // Short ticker (<= 10 chars) so the obligation-ref label uses the symbol, not the name.
  const symbol = `RC${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
  // Distinctive single-token-ish name so narration name matching is deterministic.
  const name = `Zorvex${uniqueSeedSuffix()} Industries`;
  const inst = await resolveInstrument(api, {
    type: 'stock',
    name,
    isin: generateIsin(),
    symbol,
    exchange: 'NSE',
    yahooSymbol: yahoo,
  });
  await trade(api, {
    brokerAccountId: b.id,
    instrumentId: inst.id,
    type: 'buy',
    quantity: 100,
    price: 50,
    tradeDate: todayString(-400),
  });
  return { broker: b, inst, name, symbol };
}

async function dividend(
  api: ApiClient,
  h: { broker: { id: string }; inst: { id: string } },
  amount: number,
  payOffset: number,
  extra: { tds?: number } = {}
) {
  return createDividend(api, {
    brokerAccountId: h.broker.id,
    instrumentId: h.inst.id,
    type: 'dividend',
    amount,
    payDate: todayString(payOffset),
    ...extra,
  });
}

const narr = (name: string) => `ACH C- ${name} DIVIDEND`;

function find(recon: Recon, id: string): ReconItem | undefined {
  return recon.items.find((i) => i.dividend.id === id);
}

async function reconcile(api: ApiClient, params: { brokerAccountId?: string } = {}): Promise<Recon> {
  return (await dividendReconciliation(api, params)) as unknown as Recon;
}

test.describe('Dividend receipt reconciliation API (@api)', () => {
  test('receipt statuses: awaiting / unverifiable / overdue / received / manual notes, list filter and summary', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-status');

    // No bank accounts yet: coverageEnd is null.
    const empty = await dividendReceiptSummary(api);
    expect(empty.coverageEnd ?? null).toBeNull();
    expect(empty.totalCount).toBe(0);
    expect(empty.buckets.map((b) => b.status).sort()).toEqual([...ALL_STATUSES].sort());

    const bank = await createBankAccount(api, { name: 'Status Bank' });
    const h = await seedHolding(api);
    // Only bank credit is old: coverage ends at -60, before every window below closes.
    await createTransaction(api, bank.id, { amount: 50, date: todayString(-60), description: 'Misc credit' });

    const awaiting = await dividend(api, h, 1000, 5); // window end +15 >= today
    const unverifiable = await dividend(api, h, 1000, -40); // window end -30 > coverage -60
    const linkedDiv = await dividend(api, h, 1000, -45);
    const untracked = await dividend(api, h, 1000, -41);
    const notReceived = await dividend(api, h, 1000, -42);
    const noteBeatsAwaiting = await dividend(api, h, 1000, 6);

    const credit = await createTransaction(api, bank.id, {
      amount: 1000,
      date: todayString(-45),
      description: narr(h.name),
    });
    await linkDividendTransaction(api, linkedDiv.id, credit.id);
    await setDividendReceiptStatus(api, untracked.id, 'received_untracked');
    await setDividendReceiptStatus(api, notReceived.id, 'not_received');
    // Manual note wins even over the (otherwise awaiting) window state.
    const noted = await setDividendReceiptStatus(api, noteBeatsAwaiting.id, 'not_received');
    expect(noted.receiptStatus).toBe('not_received');

    const statusOf = async (id: string) =>
      (await listDividends(api)).find((d) => d.id === id)!.receiptStatus;
    expect(await statusOf(awaiting.id)).toBe('awaiting');
    expect(await statusOf(unverifiable.id)).toBe('unverifiable');
    expect(await statusOf(linkedDiv.id)).toBe('received');
    expect(await statusOf(untracked.id)).toBe('received_untracked');
    expect(await statusOf(notReceived.id)).toBe('not_received');

    const linkedRow = (await listDividends(api)).find((d) => d.id === linkedDiv.id)!;
    expect(linkedRow.transaction?.id).toBe(credit.id);
    expect(linkedRow.transaction?.accountId).toBe(bank.id);
    expect(linkedRow.transaction?.accountName).toBe('Status Bank');
    expect(linkedRow.transaction?.date).toBe(todayString(-45));
    expect(linkedRow.transaction?.signedAmount).toBe(1000);
    expect(linkedRow.transaction?.description).toContain('DIVIDEND');

    // Summary at this point (coverageEnd = latest bank txn = -45).
    const s1 = await dividendReceiptSummary(api);
    expect(s1.coverageEnd).toBe(todayString(-45));
    expect(s1.totalCount).toBe(6);
    expect(s1.buckets).toHaveLength(6);
    const b1 = (s: string) => (s1.buckets as unknown as Bucket[]).find((b) => b.status === s)!;
    expect(b1('received').count).toBe(1);
    expect(b1('received').receivedAmount).toBe(1000);
    expect(b1('received_untracked').count).toBe(1);
    expect(b1('not_received').count).toBe(2);
    expect(b1('awaiting').count).toBe(1);
    expect(b1('unverifiable').count).toBe(1);
    expect(b1('overdue').count).toBe(0);
    expect(b1('awaiting').expectedNet).toBe(1000);
    expect(b1('not_received').expectedNet).toBe(2000);

    // Summary filters narrow the population.
    const sOther = await dividendReceiptSummary(api, { brokerAccountId: (await createBroker(api)).id });
    expect(sOther.totalCount).toBe(0);
    const sInst = await dividendReceiptSummary(api, { instrumentId: h.inst.id, type: 'dividend' });
    expect(sInst.totalCount).toBe(6);
    const sInterest = await dividendReceiptSummary(api, { type: 'interest' });
    expect(sInterest.totalCount).toBe(0);

    // Newer bank credit moves coverage past the unverifiable window -> overdue.
    const later = await createTransaction(api, bank.id, {
      amount: 77,
      date: todayString(-5),
      description: 'Another misc credit',
    });
    expect(await statusOf(unverifiable.id)).toBe('overdue');
    const s2 = await dividendReceiptSummary(api);
    expect(s2.coverageEnd).toBe(todayString(-5));
    expect((s2.buckets as unknown as Bucket[]).find((b) => b.status === 'overdue')!.count).toBe(1);
    expect((s2.buckets as unknown as Bucket[]).find((b) => b.status === 'unverifiable')!.count).toBe(0);

    // List filter works for all six statuses.
    const expected: Record<ReceiptStatus, string[]> = {
      received: [linkedDiv.id],
      received_untracked: [untracked.id],
      not_received: [notReceived.id, noteBeatsAwaiting.id],
      awaiting: [awaiting.id],
      overdue: [unverifiable.id],
      unverifiable: [],
    };
    for (const status of ALL_STATUSES) {
      const rows = await listDividends(api, { receipt: status });
      expect(rows.map((r) => r.id).sort(), `receipt=${status}`).toEqual([...expected[status]].sort());
      rows.forEach((r) => expect(r.receiptStatus).toBe(status));
    }
    // Other filters are unchanged (instrument filter + receipt combine).
    expect(await listDividends(api, { instrumentId: h.inst.id })).toHaveLength(6);
    expect(await listDividends(api, { instrumentId: h.inst.id, receipt: 'awaiting' })).toHaveLength(1);

    // Deleting the newer credit restores unverifiable; clearing a note returns to the derived state.
    const delRes = await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: later.id } } });
    expectStatus(delRes, 204);
    expect(await statusOf(unverifiable.id)).toBe('unverifiable');
    const cleared = await setDividendReceiptStatus(api, noteBeatsAwaiting.id, null);
    expect(cleared.receiptStatus).toBe('awaiting');
  });

  test('link / unlink: rules, idempotency, shared credit, TDS write-back, foreign access, receipt-status guards', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-link');
    const bank = await createBankAccount(api, { name: 'Link Bank' });
    const h = await seedHolding(api);

    const d1 = await dividend(api, h, 1000, -20);
    const d2 = await dividend(api, h, 1000, -21);
    const credit = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(h.name) });
    const debit = await createTransaction(api, bank.id, { amount: -500, date: todayString(-20), description: 'Plain debit' });

    // DEBIT -> 400 mentioning CREDIT.
    const badDebit = await api.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: d1.id } },
      body: { transactionId: debit.id, updateTds: false },
    });
    expectStatus(badDebit, 400);
    expect(badDebit.error?.message ?? '').toContain('CREDIT');

    // Manual note first, then link clears it.
    const noted = await setDividendReceiptStatus(api, d1.id, 'not_received');
    expect(noted.receiptStatus).toBe('not_received');
    // Receipt-status guards.
    for (const derived of ['received', 'awaiting', 'overdue', 'unverifiable'] as const) {
      const r = await api.PUT('/api/v1/investments/dividends/{id}/receipt-status', {
        params: { path: { id: d1.id } },
        body: { status: derived },
      });
      expectStatus(r, 400);
    }
    expect((await setDividendReceiptStatus(api, d1.id, 'received_untracked')).receiptStatus).toBe('received_untracked');
    expect((await setDividendReceiptStatus(api, d1.id, null)).receiptStatus).not.toBe('received_untracked');
    await setDividendReceiptStatus(api, d1.id, 'not_received');

    const linked = await linkDividendTransaction(api, d1.id, credit.id);
    expect(linked.receiptStatus).toBe('received');
    expect(linked.transaction?.id).toBe(credit.id);
    // Manual note was cleared: unlinking now falls back to the derived state, not not_received.
    await unlinkDividendTransaction(api, d1.id);
    const afterUnlink = (await listDividends(api)).find((d) => d.id === d1.id)!;
    expect(afterUnlink.transaction ?? null).toBeNull();
    expect(afterUnlink.receiptStatus).not.toBe('not_received');
    expect(afterUnlink.receiptStatus).not.toBe('received');
    // Idempotent unlink.
    await unlinkDividendTransaction(api, d1.id);

    // Re-link, then same-transaction relink is a 200 no-op.
    await linkDividendTransaction(api, d1.id, credit.id);
    const again = await linkDividendTransaction(api, d1.id, credit.id);
    expect(again.transaction?.id).toBe(credit.id);
    expect(again.receiptStatus).toBe('received');

    // receipt-status on a linked row -> 400.
    const linkedNote = await api.PUT('/api/v1/investments/dividends/{id}/receipt-status', {
      params: { path: { id: d1.id } },
      body: { status: 'not_received' },
    });
    expectStatus(linkedNote, 400);

    // Several dividends may share one credit.
    const shared = await linkDividendTransaction(api, d2.id, credit.id);
    expect(shared.transaction?.id).toBe(credit.id);
    const rows = await listDividends(api, { receipt: 'received' });
    expect(rows.map((r) => r.id).sort()).toEqual([d1.id, d2.id].sort());

    // Relink to a different credit replaces the link.
    const credit2 = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-19), description: 'Another' });
    const replaced = await linkDividendTransaction(api, d2.id, credit2.id);
    expect(replaced.transaction?.id).toBe(credit2.id);

    // Credit referenced by a lending row -> 400.
    const cp = await createCounterparty(api, { name: `Div Lend ${Date.now()}` });
    const lendCredit = await createTransaction(api, bank.id, { amount: 300, date: todayString(-10), description: 'Borrowed in' });
    await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 300, entryDate: monthsAgo(1), transactionId: lendCredit.id });
    const lendRes = await api.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: d1.id } },
      body: { transactionId: lendCredit.id, updateTds: false },
    });
    expectStatus(lendRes, 400);

    // TDS write-back: gap 100 of 1000 (<=25%), tds null -> written.
    const t1 = await dividend(api, h, 1000, -30);
    const c900 = await createTransaction(api, bank.id, { amount: 900, date: todayString(-30), description: narr(h.name) });
    const withTds = await linkDividendTransaction(api, t1.id, c900.id, true);
    expect(withTds.tds).toBe(100);
    // updateTds=false leaves it null.
    const t2 = await dividend(api, h, 1000, -31);
    const noTds = await linkDividendTransaction(api, t2.id, c900.id, false);
    expect(noTds.tds ?? null).toBeNull();
    // Gap above 25% -> not written.
    const t3 = await dividend(api, h, 1000, -32);
    const c700 = await createTransaction(api, bank.id, { amount: 700, date: todayString(-32), description: 'Odd credit' });
    const bigGap = await linkDividendTransaction(api, t3.id, c700.id, true);
    expect(bigGap.tds ?? null).toBeNull();
    // Existing tds is never overwritten.
    const t4 = await dividend(api, h, 1000, -33, { tds: 50 });
    const keep = await linkDividendTransaction(api, t4.id, c900.id, true);
    expect(keep.tds).toBe(50);
    // No gap (received == gross) -> tds stays null.
    const t5 = await dividend(api, h, 1000, -34);
    const full = await linkDividendTransaction(api, t5.id, credit.id, true);
    expect(full.tds ?? null).toBeNull();

    // Foreign transaction -> 400 "does not belong"; foreign dividend -> 404.
    const other = await secondUser(request, 'rcpt-link-b');
    const otherBank = await createBankAccount(other.api, { name: 'Other Bank' });
    const foreignCredit = await createTransaction(other.api, otherBank.id, { amount: 1000, date: todayString(-20), description: 'x' });
    const foreignTxn = await api.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: d1.id } },
      body: { transactionId: foreignCredit.id, updateTds: false },
    });
    expectStatus(foreignTxn, 400);
    expect(foreignTxn.error?.message ?? '').toContain('does not belong');

    const foreignPut = await other.api.PUT('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: d1.id } },
      body: { transactionId: foreignCredit.id, updateTds: false },
    });
    expectStatus(foreignPut, 404);
    await expectForeign(other.api, 'DELETE', `/api/v1/investments/dividends/${d1.id}/transaction`);
    await expectForeign(other.api, 'PUT', `/api/v1/investments/dividends/${d1.id}/receipt-status`, { status: 'not_received' });
    const stillLinked = (await listDividends(api)).find((d) => d.id === d1.id)!;
    expect(stillLinked.transaction?.id).toBe(credit.id);
    // Foreign user's summary / lists never include our rows.
    expect((await dividendReceiptSummary(other.api)).totalCount).toBe(0);
    expect(await listDividends(other.api)).toHaveLength(0);

    // Unauthenticated.
    await expectUnauthenticated('GET', '/api/v1/investments/dividends/receipts/summary');
    await expectUnauthenticated('GET', '/api/v1/investments/dividends/reconciliation');
    await expectUnauthenticated('GET', '/api/v1/investments/dividends/reconciliation/unrecorded');
    await expectUnauthenticated('POST', '/api/v1/investments/dividends/reconciliation/confirm', { items: [] });
    await expectUnauthenticated('PUT', `/api/v1/investments/dividends/${d1.id}/transaction`, { transactionId: credit.id });
    await expectUnauthenticated('DELETE', `/api/v1/investments/dividends/${d1.id}/transaction`);
    await expectUnauthenticated('PUT', `/api/v1/investments/dividends/${d1.id}/receipt-status`, { status: null });
  });

  test('reconciliation candidate tiers: EXACT, NET_OF_TDS, FUZZY (needs name + keyword), neutral narration rejected', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-tiers');
    const bank = await createBankAccount(api, { name: 'Tier Bank' });
    const hE = await seedHolding(api);
    const hN = await seedHolding(api, hE.broker);
    const hF = await seedHolding(api, hE.broker);
    const hX = await seedHolding(api, hE.broker);
    const hI = await seedHolding(api, hE.broker);

    const dE = await dividend(api, hE, 1000, -20);
    const dN = await dividend(api, hN, 2000, -20);
    const dF = await dividend(api, hF, 3000, -20);
    const dX = await dividend(api, hX, 4000, -20);
    const dI = await dividend(api, hI, 5000, -20); // nothing in its window
    // Distinct amounts keep the five dividends from competing for one another's credits.
    const cE = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(hE.name) });
    const cN = await createTransaction(api, bank.id, { amount: 1800, date: todayString(-19), description: narr(hN.name) });
    const cF = await createTransaction(api, bank.id, { amount: 2400, date: todayString(-18), description: `${hF.name} DIV PAYOUT` });
    const cX = await createTransaction(api, bank.id, { amount: 3200, date: todayString(-18), description: 'UPI/PAYMENT RECEIVED 998877' });
    // Out of window credit for dI (pay -20 -> window -30..-10): dated -60.
    await createTransaction(api, bank.id, { amount: 5000, date: todayString(-60), description: narr(hI.name) });

    const recon = await reconcile(api);
    expect(recon.coverageEnd).toBe(todayString(-18));

    const iE = find(recon, dE.id)!;
    expect(iE.candidates).toHaveLength(1);
    expect(iE.candidates[0].transaction.id).toBe(cE.id);
    expect(iE.candidates[0].tier).toBe('EXACT');
    expect(typeof iE.candidates[0].score).toBe('number');
    expect(iE.candidates[0].reasons.length).toBeGreaterThan(0);

    const iN = find(recon, dN.id)!;
    expect(iN.candidates).toHaveLength(1);
    expect(iN.candidates[0].transaction.id).toBe(cN.id);
    expect(iN.candidates[0].tier).toBe('NET_OF_TDS');
    expect(iN.candidates[0].impliedTds).toBe(200);

    const iF = find(recon, dF.id)!;
    expect(iF.candidates).toHaveLength(1);
    expect(iF.candidates[0].transaction.id).toBe(cF.id);
    expect(iF.candidates[0].tier).toBe('FUZZY');

    // Neutral narration -> no candidate (fuzzy requires keyword AND company name).
    const iX = find(recon, dX.id);
    expect(iX?.candidates ?? []).toHaveLength(0);
    const iI = find(recon, dI.id);
    expect(iI?.candidates ?? []).toHaveLength(0);
    // The neutral credit is not offered to any dividend.
    for (const it of recon.items) {
      for (const c of it.candidates) expect(c.transaction.id).not.toBe(cX.id);
    }

    expect(recon.withCandidates).toBe(3);
    expect(recon.unresolvedCount).toBeGreaterThanOrEqual(5);

    // brokerAccountId filter: another broker has nothing; ours has the dividends.
    const otherBroker = await createBroker(api);
    const none = await reconcile(api, { brokerAccountId: otherBroker.id });
    expect(none.items).toHaveLength(0);
    expect(none.unresolvedCount).toBe(0);
    expect(none.withCandidates).toBe(0);
    const mine = await reconcile(api, { brokerAccountId: hE.broker.id });
    expect(find(mine, dE.id)?.dividend.id).toBe(dE.id);

    // Linked dividends drop out of the reconciliation queue.
    await linkDividendTransaction(api, dE.id, cE.id);
    const after = await reconcile(api);
    expect(find(after, dE.id)).toBeUndefined();
    expect(after.withCandidates).toBe(2);
  });

  test('reconciliation exclusions, greedy one-credit-per-dividend, and confirm with partial success', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-confirm');
    const bank = await createBankAccount(api, { name: 'Confirm Bank' });
    const hA = await seedHolding(api);
    const hB = await seedHolding(api, hA.broker);
    const hC = await seedHolding(api, hA.broker);

    // dA already holds credit cA. dB/dC are unlinked and would otherwise want the same-amount credits.
    const dA = await dividend(api, hA, 1000, -20);
    const cA = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(hA.name) });
    await linkDividendTransaction(api, dA.id, cA.id);

    const dB = await dividend(api, hB, 1000, -20);
    const dC = await dividend(api, hC, 1000, -22);

    // Lending-linked credit: same amount/date as dB's, must not be proposed.
    const cp = await createCounterparty(api, { name: `Excl Person ${Date.now()}` });
    const lendCredit = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(hB.name) });
    await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 1000, entryDate: monthsAgo(1), transactionId: lendCredit.id });

    let recon = await reconcile(api);
    for (const it of recon.items) {
      for (const c of it.candidates) {
        expect(c.transaction.id).not.toBe(cA.id);
        expect(c.transaction.id).not.toBe(lendCredit.id);
      }
    }
    expect(find(recon, dB.id)?.candidates ?? []).toHaveLength(0);

    // A fresh credit: both dB (date -20, exact) and dC (-22 window) can use it; only one gets it.
    const cG = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(hB.name) });
    recon = await reconcile(api);
    const holders = recon.items.filter((i) => i.candidates.some((c) => c.transaction.id === cG.id));
    expect(holders).toHaveLength(1);
    expect(holders[0].dividend.id).toBe(dB.id); // best score, nearest date

    // Credit inside a transaction-link group is excluded (settlement link).
    const linkedA = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-22), description: narr(hC.name) });
    const bank2 = await createBankAccount(api, { name: 'Confirm Bank 2' });
    const linkedB = await createTransaction(api, bank2.id, { amount: -1000, date: todayString(-22), description: 'Linked debit' });
    const linkRes = await api.POST('/api/v1/transaction-links', {
      body: {
        type: 'TRANSFER',
        members: [
          { transactionId: linkedB.id, isAnchor: true },
          { transactionId: linkedA.id, isAnchor: false },
        ],
      },
    });
    expectStatus(linkRes, 201);
    const r2 = await reconcile(api);
    for (const it of r2.items) {
      for (const c of it.candidates) expect(c.transaction.id).not.toBe(linkedA.id);
    }

    // Confirm with partial success: dB<-cG ok (TDS none), dC<-debit skipped.
    const debit = await createTransaction(api, bank.id, { amount: -50, date: todayString(-22), description: 'A debit' });
    const res = await confirmDividendMatches(api, [
      { dividendId: dB.id, transactionId: cG.id },
      { dividendId: dC.id, transactionId: debit.id },
    ]);
    expect(res.linked).toHaveLength(1);
    expect(res.linked[0].id).toBe(dB.id);
    expect(res.linked[0].transaction?.id).toBe(cG.id);
    expect(res.linked[0].receiptStatus).toBe('received');
    expect(res.skipped).toHaveLength(1);
    expect((res.skipped[0] as unknown as { dividendId: string }).dividendId).toBe(dC.id);
    expect(((res.skipped[0] as unknown as { reason: string }).reason ?? '').length).toBeGreaterThan(0);
    expect(((res.skipped[0] as unknown as { reason: string }).reason ?? '')).toContain('CREDIT');
    // dC stays unlinked.
    expect((await listDividends(api)).find((d) => d.id === dC.id)!.transaction ?? null).toBeNull();

    // TDS write-back through confirm.
    const hT = await seedHolding(api, hA.broker);
    const dT = await dividend(api, hT, 2000, -15);
    const cT = await createTransaction(api, bank.id, { amount: 1800, date: todayString(-15), description: narr(hT.name) });
    const confirmed = await confirmDividendMatches(api, [{ dividendId: dT.id, transactionId: cT.id, updateTds: true }]);
    expect(confirmed.skipped).toHaveLength(0);
    expect(confirmed.linked[0].tds).toBe(200);

    // Already-linked dividends are no longer reconciliation items.
    const afterRecon = await reconcile(api);
    expect(find(afterRecon, dB.id)).toBeUndefined();
    expect(find(afterRecon, dT.id)).toBeUndefined();

    // Foreign / unknown pair is skipped, not applied.
    const other = await secondUser(request, 'rcpt-confirm-b');
    const foreignRes = await other.api.POST('/api/v1/investments/dividends/reconciliation/confirm', {
      body: { items: [{ dividendId: dC.id, transactionId: debit.id, updateTds: false }] } as never,
    });
    expect(foreignRes.response.status).toBe(200);
    const foreignData = foreignRes.data as unknown as { linked: unknown[]; skipped: unknown[] };
    expect(foreignData.linked).toHaveLength(0);
    expect(foreignData.skipped).toHaveLength(1); // every submitted item is skipped
    // The owner's dividend is untouched.
    expect((await listDividends(api)).find((d) => d.id === dC.id)!.transaction ?? null).toBeNull();
  });

  test('unrecorded credits scan: shows DIV credit with holding hint, hides once linked, validates range', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-unrec');
    const bank = await createBankAccount(api, { name: 'Unrec Bank' });
    const h = await seedHolding(api);

    const divCredit = await createTransaction(api, bank.id, { amount: 500, date: todayString(-10), description: narr(h.name) });
    const plainCredit = await createTransaction(api, bank.id, { amount: 500, date: todayString(-10), description: 'SALARY ACME CORP' });
    const divDebit = await createTransaction(api, bank.id, { amount: -500, date: todayString(-10), description: `REVERSAL ${h.name} DIVIDEND` });
    const idclCredit = await createTransaction(api, bank.id, { amount: 90, date: todayString(-9), description: 'NEFT IDCW LIQUID FUND PAYOUT' });
    const oldCredit = await createTransaction(api, bank.id, { amount: 70, date: todayString(-500), description: narr(h.name) });

    const scan = (await unrecordedDividendCredits(api)) as unknown as Unrecorded;
    expect(scan.to).toBe(todayString(0));
    expect(scan.from).toBe(todayString(-365));
    const ids = scan.items.map((i) => i.transaction.id);
    expect(ids).toContain(divCredit.id);
    expect(ids).toContain(idclCredit.id);
    expect(ids).not.toContain(plainCredit.id);
    expect(ids).not.toContain(divDebit.id);
    expect(ids).not.toContain(oldCredit.id); // outside the default 365d window

    const row = scan.items.find((i) => i.transaction.id === divCredit.id)!;
    expect(row.holdingHints.length).toBeGreaterThan(0);
    expect(row.holdingHints.length).toBeLessThanOrEqual(3);
    const hint = row.holdingHints[0];
    expect(hint.instrumentId).toBe(h.inst.id);
    expect(hint.brokerAccountId).toBe(h.broker.id);
    expect(hint.instrumentName).toBe(h.name);
    expect(hint.nameScore).toBeGreaterThanOrEqual(0.5);
    expect(hint.holdingId).toEqual(expect.any(String));
    expect(hint.symbol).toBe(h.symbol);
    expect(hint.brokerName).toEqual(expect.any(String));
    for (let i = 1; i < row.holdingHints.length; i++) {
      expect(row.holdingHints[i - 1].nameScore).toBeGreaterThanOrEqual(row.holdingHints[i].nameScore);
    }
    // IDCW credit with no resembling holding: listed, with no hints.
    expect(scan.items.find((i) => i.transaction.id === idclCredit.id)!.holdingHints).toHaveLength(0);

    // Explicit range.
    const ranged = (await unrecordedDividendCredits(api, {
      from: todayString(-600),
      to: todayString(-400),
    })) as unknown as Unrecorded;
    expect(ranged.items.map((i) => i.transaction.id)).toEqual([oldCredit.id]);
    expect(ranged.from).toBe(todayString(-600));
    expect(ranged.to).toBe(todayString(-400));

    // from > to -> 400.
    const bad = await api.GET('/api/v1/investments/dividends/reconciliation/unrecorded', {
      params: { query: { from: todayString(-1), to: todayString(-30) } },
    });
    expectStatus(bad, 400);

    // Link it to a dividend -> it disappears from the scan.
    const d = await dividend(api, h, 500, -10);
    await linkDividendTransaction(api, d.id, divCredit.id);
    const after = (await unrecordedDividendCredits(api)) as unknown as Unrecorded;
    expect(after.items.map((i) => i.transaction.id)).not.toContain(divCredit.id);
    expect(after.items.map((i) => i.transaction.id)).toContain(idclCredit.id);

    // Tenancy: another user sees none of these.
    const other = await secondUser(request, 'rcpt-unrec-b');
    const otherScan = (await unrecordedDividendCredits(other.api)) as unknown as Unrecorded;
    expect(otherScan.items).toHaveLength(0);
  });

  test('transaction side: obligationRefs, type-flip guard, lending refusal, merge re-point/refusal, delete survival', async ({
    request,
  }) => {
    const { api } = await freshUser(request, 'rcpt-txn');
    const bank = await createBankAccount(api, { name: 'Txn Side Bank' });
    const h = await seedHolding(api);
    const d = await dividend(api, h, 1000, -20);
    const credit = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: narr(h.name) });
    await linkDividendTransaction(api, d.id, credit.id);

    // obligationRefs via search and via the paged list.
    const viaSearch = await findById(api, credit.id);
    const ref = viaSearch!.obligationRefs.find((r) => r.kind === 'DIVIDEND')!;
    expect(ref.id).toBe(d.id);
    expect(ref.parentId).toBe(h.inst.id);
    expect(ref.label).toBe(`Dividend · ${h.symbol}`);
    expect(ref.amount).toBe(1000);
    const list = await api.GET('/api/v1/transactions', { params: { query: { page: 0, size: 100 } } });
    expectStatus(list, 200);
    const listed = list.data!.content.find((t) => t.id === credit.id)!;
    expect(listed.obligationRefs.some((r) => r.kind === 'DIVIDEND' && r.id === d.id)).toBe(true);

    // Several dividends on one credit give several refs.
    const d2 = await dividend(api, h, 500, -21);
    await linkDividendTransaction(api, d2.id, credit.id);
    const two = await findById(api, credit.id);
    expect(two!.obligationRefs.filter((r) => r.kind === 'DIVIDEND')).toHaveLength(2);
    await unlinkDividendTransaction(api, d2.id);

    // Type flip credit -> debit refused, same-sign edit fine.
    const flip = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: credit.id } },
      body: { accountId: bank.id, amount: -1000, date: credit.date, description: credit.description ?? undefined },
    });
    expectStatus(flip, 400);
    expect(flip.error?.message ?? '').toContain('unlink');
    const same = await api.PUT('/api/v1/transactions/{id}', {
      params: { path: { id: credit.id } },
      body: { accountId: bank.id, amount: 1100, date: credit.date, description: 'Edited dividend credit' },
    });
    expectStatus(same, 200);

    // Lending on a dividend-linked credit -> 400 mentioning dividend.
    const lendRes = await api.POST('/api/v1/lendings', {
      body: {
        newCounterpartyName: `Div Refusal ${Date.now()}`,
        direction: 'borrowed',
        amount: 1000,
        entryDate: monthsAgo(1),
        transactionId: credit.id,
      },
    });
    expectStatus(lendRes, 400);
    expect((lendRes.error?.message ?? '').toLowerCase()).toContain('dividend');

    // Merge re-points the dividend onto the kept transaction.
    const keep = await createTransaction(api, bank.id, { amount: 1000, date: todayString(-20), description: 'Kept credit' });
    const merged = await api.POST('/api/v1/transactions/merge', { body: { keepId: keep.id, deleteId: credit.id } });
    expectStatus(merged, 200);
    expect(merged.data?.keptId).toBe(keep.id);
    const dAfter = (await listDividends(api)).find((x) => x.id === d.id)!;
    expect(dAfter.transaction?.id).toBe(keep.id);
    expect(dAfter.receiptStatus).toBe('received');
    expect(await findById(api, credit.id)).toBeNull();
    const keptAfter = await findById(api, keep.id);
    expect(keptAfter!.obligationRefs.some((r) => r.kind === 'DIVIDEND' && r.id === d.id)).toBe(true);

    // Merge refusal: kept is lending-linked, deleted is dividend-linked.
    const cp = await createCounterparty(api, { name: `Merge Refusal ${Date.now()}` });
    const lendKept = await createTransaction(api, bank.id, { amount: 800, date: todayString(-20), description: 'Lending credit' });
    await addLending(api, { counterpartyId: cp.id, direction: 'borrowed', amount: 800, entryDate: monthsAgo(1), transactionId: lendKept.id });
    const refuse = await api.POST('/api/v1/transactions/merge', { body: { keepId: lendKept.id, deleteId: keep.id } });
    expectStatus(refuse, 400);
    expect(refuse.error?.message ?? '').toContain('unlink one before merging');
    // Nothing changed.
    expect((await listDividends(api)).find((x) => x.id === d.id)!.transaction?.id).toBe(keep.id);

    // Deleting the linked credit: dividend survives with no transaction.
    const del = await api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: keep.id } } });
    expectStatus(del, 204);
    const survivor = (await listDividends(api)).find((x) => x.id === d.id);
    expect(survivor).toBeDefined();
    expect(survivor!.transaction ?? null).toBeNull();
    expect(survivor!.receiptStatus).not.toBe('received');
  });
});
