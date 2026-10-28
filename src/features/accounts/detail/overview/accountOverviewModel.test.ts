import { describe, expect, it } from 'vitest';

import type { Broker, GenericAccount } from '@/lib/account.types';
import type { StatementSummary } from '@/lib/statement.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import {
  buildBrokerCash,
  buildFlowKpis,
  buildGmailCard,
  buildLatestStatement,
  buildLinked,
  lastEntryDate,
  ordinal,
} from './accountOverviewModel';
import { buildHeaderModel } from './headerModel';

pinClock();

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [5, '5th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
  ])('%i is %s', (n, text) => expect(ordinal(n)).toBe(text));
});

describe('buildFlowKpis', () => {
  const flow = {
    moneyIn: 720000,
    moneyOut: 541870,
    averageDailyBalance: 262400,
    interestLastQuarter: 1842,
    topInCategories: ['Salary', 'Transfer'],
    topOutCategories: ['Rent', 'EMI', 'Card bills', 'Food'],
  };

  it('builds In, Out and Average daily balance with their context', () => {
    expect(buildFlowKpis(flow)).toEqual([
      { label: 'In · 90 days', value: '+₹7,20,000', context: 'Salary, Transfer' },
      { label: 'Out · 90 days', value: '₹5,41,870', context: 'Rent, EMI, Card bills' },
      {
        label: 'Avg daily balance',
        value: '₹2,62,400',
        context: 'interest ₹1,842 last quarter',
      },
    ]);
  });

  it('leaves context out when there is none, and shows a dash without a balance', () => {
    const [inTile, , avg] = buildFlowKpis({
      ...flow,
      averageDailyBalance: null,
      interestLastQuarter: 0,
      topInCategories: [],
    });
    expect(inTile.context).toBeUndefined();
    expect(avg.value).toBe('—');
    expect(avg.context).toBeUndefined();
  });
});

describe('buildLatestStatement', () => {
  const stmt = (over: Partial<StatementSummary>): StatementSummary =>
    ({
      id: 's1',
      periodEnd: '2026-09-30',
      transactionCount: 12,
      closingBalance: 148320,
      createdAt: '2026-10-13T08:00:00Z',
      ...over,
    }) as StatementSummary;

  it('is null without statements', () => {
    expect(buildLatestStatement([], {})).toBeNull();
  });

  it('describes the newest statement', () => {
    const row = buildLatestStatement(
      [stmt({ id: 'old', periodEnd: '2026-08-31' }), stmt({})],
      {},
    );
    expect(row).toEqual({
      id: 's1',
      title: 'September 2026',
      caption: '12 rows · closing ₹1,48,320 · uploaded 13 Oct',
      gap: false,
    });
  });

  it('flags a gap only on the anchor statement when the ledger disagrees', () => {
    const statements = [stmt({})];
    expect(
      buildLatestStatement(statements, { anchorDate: '2026-09-30', reconciliationGap: 500 })?.gap,
    ).toBe(true);
    expect(
      buildLatestStatement(statements, { anchorDate: '2026-08-31', reconciliationGap: 500 })?.gap,
    ).toBe(false);
    expect(
      buildLatestStatement(statements, { anchorDate: '2026-09-30', reconciliationGap: null })?.gap,
    ).toBe(false);
  });

  it('leaves out a missing closing balance and singularises one row', () => {
    expect(
      buildLatestStatement([stmt({ closingBalance: null, transactionCount: 1 })], {})?.caption,
    ).toBe('1 row · uploaded 13 Oct');
  });
});

describe('buildGmailCard', () => {
  const alert = { description: 'BigBasket', amount: -3600, date: '2026-10-13' };

  it('is active with a last alert, today spelled out, and the unmatched count', () => {
    expect(
      buildGmailCard({ ingestFromDate: '2026-06-15', lastAlert: alert, unmatchedCount: 1, today: '2026-10-13' }),
    ).toEqual({ subtitle: 'Since 15 Jun', active: true, lastAlert: 'BigBasket ₹3,600 · today', unmatched: 1 });
  });

  it('dates an older alert and drops a zero unmatched count', () => {
    const m = buildGmailCard({
      ingestFromDate: '2026-06-15',
      lastAlert: { ...alert, date: '2026-10-11' },
      unmatchedCount: 0,
      today: '2026-10-13',
    });
    expect(m.lastAlert).toBe('BigBasket ₹3,600 · 11 Oct');
    expect(m.unmatched).toBeUndefined();
  });

  it('is off without an ingest date, and shows a dash for Last alert when the summary failed', () => {
    expect(
      buildGmailCard({ ingestFromDate: null, lastAlert: undefined, unmatchedCount: undefined, today: '2026-10-13' }),
    ).toEqual({ subtitle: undefined, active: false, lastAlert: '—', unmatched: undefined });
  });
});

describe('buildLinked', () => {
  it('lists EMIs with their due day and card bills as one row', () => {
    expect(
      buildLinked({
        emis: [
          { loanId: 'l1', name: 'Home loan EMI', amount: 36603, nextDueDate: '2026-11-05' },
          { loanId: 'l2', name: 'Car loan EMI', amount: 17748 },
        ],
        cardBills: [
          { accountId: 'c1', name: 'Regalia' },
          { accountId: 'c2', name: 'SBI' },
        ],
      }),
    ).toEqual([
      { key: 'l1', label: 'Home loan EMI', value: '₹36,603 on the 5th' },
      { key: 'l2', label: 'Car loan EMI', value: '₹17,748' },
      { key: 'card-bills', label: 'Card bills', value: 'Regalia, SBI' },
    ]);
  });

  it('is empty when nothing pays from the account', () => {
    expect(buildLinked({ emis: [], cardBills: [] })).toEqual([]);
  });
});

describe('wallet and broker headers', () => {
  const wallet: GenericAccount = { id: 'w1', type: AccountType.GENERIC, name: 'Paytm', balance: 2844 };

  it('captions a wallet with its newest entry', () => {
    expect(buildHeaderModel(wallet, null, '2026-10-13', '2026-10-12').caption).toEqual([
      'Manual balance',
      'last entry 12 Oct',
    ]);
    expect(buildHeaderModel(wallet, null, '2026-10-13', null).caption).toEqual(['Manual balance']);
  });

  it('captions a broker with its cash balance', () => {
    const broker: Broker = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 428439, cashBalance: 12500 };
    expect(buildHeaderModel(broker, null, '2026-10-13').caption).toEqual(['cash ₹12,500']);
    expect(buildHeaderModel({ ...broker, cashBalance: undefined }, null, '2026-10-13').caption).toEqual([]);
  });
});

describe('broker cash and last entry', () => {
  const broker: Broker = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', cashBalance: 12500 };
  const tx = (id: string, date: string, amount: number, description: string, transfer = false) =>
    ({ id, date, amount, description, links: transfer ? [{ linkId: 'l', type: 'TRANSFER' }] : [] }) as unknown as Transaction;

  it('shows the cash balance and the newest linked-transfer credit as the last transfer in', () => {
    const m = buildBrokerCash(broker, [
      tx('a', '2026-10-09', 5000, 'Transfer from ICICI', true),
      tx('b', '2026-10-12', -300, 'Brokerage'),
      tx('c', '2026-10-07', 25000, 'Transfer from HDFC', true),
      tx('d', '2026-10-11', 900, 'Dividend credit'),
    ]);
    expect(m).toEqual({ available: '₹12,500', lastTransferIn: '₹5,000 · 9 Oct · Transfer from ICICI' });
  });

  it('has no last transfer without a transfer credit, and shows a dash for a missing cash balance', () => {
    expect(buildBrokerCash({ ...broker, cashBalance: undefined }, [tx('b', '2026-10-12', 300, 'Dividend')])).toEqual({
      available: '—',
      lastTransferIn: undefined,
    });
    expect(buildBrokerCash(broker, null).lastTransferIn).toBeUndefined();
  });

  it('finds the newest entry date', () => {
    expect(lastEntryDate([tx('a', '2026-10-08', 1, ''), tx('b', '2026-10-12', 1, '')])).toBe('2026-10-12');
    expect(lastEntryDate([])).toBeNull();
    expect(lastEntryDate(undefined)).toBeNull();
  });
});
