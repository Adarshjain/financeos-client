import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ObligationItem } from '@/components/obligations/types';
import { formatMoney } from '@/lib/utils';

import { TotalsStrip } from '../TotalsStrip';

const TODAY = '2026-10-08';
const i = (o: Partial<ObligationItem>) => ({ type: 'emi', status: 'upcoming', date: '2026-10-10', amount: 100, ...o }) as ObligationItem;

function stat(container: HTMLElement, label: string): string {
  const l = [...container.querySelectorAll('div')].find((d) => d.textContent === label)!;
  return l.nextElementSibling!.textContent!;
}

describe('TotalsStrip', () => {
  it('sums next-7-days (inclusive of today and today+7), this month, and overdue separately', () => {
    const items = [
      i({ date: '2026-10-08', amount: 10 }),
      i({ date: '2026-10-15', amount: 20 }),
      i({ date: '2026-10-20', amount: 40 }), // this month, beyond 7 days
      i({ date: '2026-11-02', amount: 80 }), // next month: counts nowhere
      i({ status: 'overdue', date: '2026-09-30', amount: 1000 }),
    ];
    const { container } = render(<TotalsStrip items={items} today={TODAY} />);
    expect(stat(container, 'Due next 7 days')).toBe(formatMoney(30));
    expect(stat(container, 'This month')).toBe(formatMoney(70));
    expect(stat(container, 'Overdue')).toBe(formatMoney(1000));
  });

  it('ignores rows without an amount, undated rows and past-dated non-overdue rows', () => {
    const items = [
      i({ amount: null }),
      i({ date: null, amount: 500 }),
      i({ date: '2026-10-01', amount: 700, status: 'upcoming' }),
    ];
    const { container } = render(<TotalsStrip items={items} today={TODAY} />);
    expect(stat(container, 'Due next 7 days')).toBe(formatMoney(0));
    expect(stat(container, 'This month')).toBe(formatMoney(0));
    expect(stat(container, 'Overdue')).toBe(formatMoney(0));
  });

  it('overdue figure turns rose only when positive', () => {
    const { container, rerender } = render(<TotalsStrip items={[i({ status: 'overdue', amount: 5 })]} today={TODAY} />);
    expect(container.querySelector('.text-rose-600')).not.toBeNull();
    rerender(<TotalsStrip items={[]} today={TODAY} />);
    expect(container.querySelector('.text-rose-600')).toBeNull();
  });
});
