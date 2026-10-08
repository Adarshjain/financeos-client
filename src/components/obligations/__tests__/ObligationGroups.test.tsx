import '@/test/next-mocks';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/lib/utils';

import { bucketObligations, ObligationGroups, sumAmounts } from '../ObligationGroups';
import type { ObligationItem } from '../types';

const TODAY = '2026-10-08';
let n = 0;
const it_ = (o: Partial<ObligationItem>): ObligationItem =>
  ({ type: 'emi', status: 'upcoming', date: '2026-10-10', amount: 100, title: `item-${n++}`, ...o }) as ObligationItem;

describe('sumAmounts', () => {
  it('sums amounts treating null as zero', () => {
    expect(sumAmounts([it_({ amount: 10 }), it_({ amount: null }), it_({ amount: 5.5 })])).toBe(15.5);
    expect(sumAmounts([])).toBe(0);
  });
});

describe('bucketObligations', () => {
  it('puts overdue first regardless of date', () => {
    const b = bucketObligations([it_({ status: 'overdue', date: '2026-09-01' }), it_({ status: 'overdue', date: null })], TODAY);
    expect(b.overdue).toHaveLength(2);
    expect(b.undated).toHaveLength(0);
  });
  it('undated non-overdue go to undated', () => {
    expect(bucketObligations([it_({ date: null })], TODAY).undated).toHaveLength(1);
  });
  it('next 7 days is inclusive of today+7', () => {
    const b = bucketObligations([it_({ date: '2026-10-08' }), it_({ date: '2026-10-15' }), it_({ date: '2026-10-16' })], TODAY);
    expect(b.next7.map((i) => i.date)).toEqual(['2026-10-08', '2026-10-15']);
    expect(b.laterThisMonth.map((i) => i.date)).toEqual(['2026-10-16']);
  });
  it('7-day window crossing a month end puts next-month dates in next7', () => {
    const b = bucketObligations([it_({ date: '2026-11-02' })], '2026-10-30');
    expect(b.next7).toHaveLength(1);
    expect(b.months).toHaveLength(0);
  });
  it('later months are grouped and sorted chronologically with a month label', () => {
    const b = bucketObligations([it_({ date: '2027-01-05' }), it_({ date: '2026-12-05' }), it_({ date: '2026-12-20' })], TODAY);
    expect(b.months.map((m) => m.key)).toEqual(['2026-12', '2027-01']);
    expect(b.months[0].items).toHaveLength(2);
    expect(b.months[0].label).toMatch(/December/);
    expect(b.months[0].label).toMatch(/2026/);
  });
});

describe('ObligationGroups', () => {
  it('renders the empty state with singular/plural months', () => {
    const { rerender } = render(<ObligationGroups items={[]} months={1} today={TODAY} />);
    expect(screen.getByText(/Nothing scheduled within the next 1 month\./)).toBeInTheDocument();
    rerender(<ObligationGroups items={[]} months={6} today={TODAY} />);
    expect(screen.getByText(/next 6 months\./)).toBeInTheDocument();
  });

  it('renders sections in order with counts and totals, hiding empty ones', () => {
    const items = [
      it_({ status: 'overdue', date: '2026-10-01', amount: 300 }),
      it_({ date: '2026-10-10', amount: 100 }),
      it_({ date: '2026-10-25', amount: 50 }),
      it_({ date: '2026-12-02', amount: 70 }),
      it_({ date: null, amount: null }),
    ];
    const { container } = render(<ObligationGroups items={items} months={3} today={TODAY} />);
    const heads = [...container.querySelectorAll('.border-b')].map((e) => e.textContent ?? '');
    expect(heads[0]).toContain('Overdue (1)');
    expect(heads[0]).toContain(formatMoney(300));
    expect(heads[1]).toContain('Next 7 days (1)');
    expect(heads[2]).toContain('Later this month (1)');
    expect(heads[3]).toMatch(/December.*\(1\)/);
    expect(heads[4]).toContain('No due date yet (1)');
    expect(heads[4]).toContain(formatMoney(0));
  });

  it('omits sections with no items', () => {
    render(<ObligationGroups items={[it_({ date: '2026-10-10' })]} months={3} today={TODAY} />);
    expect(screen.queryByText(/Overdue \(/)).toBeNull();
    expect(screen.queryByText(/No due date yet/)).toBeNull();
    expect(screen.getByText(/Next 7 days \(1\)/)).toBeInTheDocument();
  });

  it('highlights only the row matching highlightStatementId', () => {
    const items = [
      it_({ type: 'card_bill', statementId: 'S1', date: '2026-10-10' }),
      it_({ type: 'card_bill', statementId: 'S2', date: '2026-10-11' }),
    ];
    const { container } = render(<ObligationGroups items={items} months={3} today={TODAY} highlightStatementId="S2" />);
    expect(container.querySelector('[data-bill-row="S2"]')!.className).toContain('ring-emerald-300');
    expect(container.querySelector('[data-bill-row="S1"]')!.className).not.toContain('ring-emerald-300');
  });

  it('passes onMarkPaid through to card rows', () => {
    render(
      <ObligationGroups items={[it_({ type: 'card_bill', statementId: 'S1' })]} months={3} today={TODAY} onMarkPaid={() => {}} />
    );
    expect(within(document.body).getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
  });
});
