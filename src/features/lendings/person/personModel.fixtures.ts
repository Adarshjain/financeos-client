import type {
  CounterpartyLedgerResponse,
  LedgerEntryResponse,
  LendingCycleResponse,
  PersonCounterparty,
} from '@/lib/lending.types';

export function personFixture(over: Partial<PersonCounterparty> = {}): PersonCounterparty {
  return {
    id: 'p1',
    name: 'Rahul Sharma',
    notes: 'College friend',
    entryCount: 3,
    netPosition: 15000,
    repaidByYou: 0,
    repaidToYou: 11800,
    totalBorrowed: 0,
    totalLent: 26800,
    expectedReturnDate: '2026-10-28',
    firstEntryDate: '2026-05-02',
    linkedEntryCount: 1,
    ...over,
  };
}

export function entryFixture(over: Partial<LedgerEntryResponse> = {}): LedgerEntryResponse {
  return {
    id: 'e1',
    counterpartyId: 'p1',
    counterpartyName: 'Rahul Sharma',
    createdAt: '2026-08-29T10:00:00Z',
    cycle: 1,
    direction: 'lent',
    kind: 'principal',
    amount: 25000,
    entryDate: '2026-08-29',
    runningBalance: 25000,
    notes: 'Laptop advance',
    ...over,
  };
}

/** Newest first, as the server returns it: a part repayment, the laptop advance, a settled dinner split. */
export function entriesFixture(): LedgerEntryResponse[] {
  return [
    entryFixture({
      id: 'e3',
      cycle: 2,
      direction: 'borrowed',
      kind: 'settlement',
      amount: 10000,
      entryDate: '2026-10-10',
      runningBalance: 15000,
      notes: 'Part repayment',
      transaction: { id: 't1', accountId: 'a1', accountName: 'HDFC Savings', date: '2026-10-10', description: 'UPI from Rahul Sharma', signedAmount: 10000 },
    }),
    entryFixture({ id: 'e2', cycle: 2, amount: 25000, runningBalance: 25000, expectedReturnDate: '2026-10-28' }),
    entryFixture({ id: 'e1b', direction: 'borrowed', kind: 'settlement', amount: 1800, entryDate: '2026-05-09', runningBalance: 0, notes: null }),
    entryFixture({ id: 'e1', amount: 1800, entryDate: '2026-05-02', runningBalance: 1800, notes: 'Dinner split' }),
  ];
}

/** The cycles of newest-first entries, newest first; a cycle is settled when its newest entry leaves a zero balance. */
export function cyclesFixture(entries: LedgerEntryResponse[]): LendingCycleResponse[] {
  const numbers = [...new Set(entries.map((e) => e.cycle))].sort((a, b) => b - a);
  return numbers.map((number) => {
    const own = entries.filter((e) => e.cycle === number);
    const lent = own.filter((e) => e.direction === 'lent').reduce((sum, e) => sum + e.amount, 0);
    const received = own.filter((e) => e.direction === 'borrowed').reduce((sum, e) => sum + e.amount, 0);
    return {
      number,
      startDate: own[own.length - 1].entryDate,
      endDate: own[0].entryDate,
      settled: own[0].runningBalance === 0,
      entryCount: own.length,
      lent,
      received,
      closing: own[0].runningBalance,
    };
  });
}

export function ledgerFixture(
  entries = entriesFixture(),
  totalPages = 1,
  selectedCycle: number | null = null,
): CounterpartyLedgerResponse {
  return {
    entries: {
      content: entries,
      number: 0,
      size: 25,
      numberOfElements: entries.length,
      totalElements: entries.length,
      totalPages,
      first: true,
      last: true,
      empty: entries.length === 0,
      pageable: {} as never,
      sort: [],
    },
    cycles: cyclesFixture(entries),
    selectedCycle,
    totals: { lent: 26800, received: 11800, closing: 15000 },
  };
}
