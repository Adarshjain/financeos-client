import '@/test/next-mocks';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ObligationItem } from '@/components/obligations/types';
import { formatDate } from '@/lib/utils';

import { CalendarGrid } from '../CalendarGrid';

const TODAY = '2026-10-08'; // Thursday; 1 Oct 2026 is a Thursday
const i = (o: Partial<ObligationItem>) => ({ type: 'emi', status: 'upcoming', date: '2026-10-08', amount: 100, title: 'X', ...o }) as ObligationItem;

const dayButton = (n: number) => screen.getAllByRole('button').find((b) => b.textContent?.startsWith(String(n)) && b.querySelector('.tabular-nums')?.textContent === String(n))!;

describe('CalendarGrid', () => {
  it('shows the current month and Monday-first weekday headers', () => {
    const { container } = render(<CalendarGrid items={[]} today={TODAY} />);
    expect(screen.getByText(/October/)).toBeInTheDocument();
    const heads = [...container.querySelectorAll('.uppercase')].map((e) => e.textContent);
    expect(heads).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('pads leading blanks so the 1st of October 2026 (Thursday) sits in the 4th column', () => {
    const { container } = render(<CalendarGrid items={[]} today={TODAY} />);
    const grid = container.querySelector('.grid-cols-7')!;
    // 7 headers, then 3 blank cells, then day 1
    const children = [...grid.children];
    expect(children[7].tagName).toBe('DIV');
    expect(children[9].tagName).toBe('DIV');
    expect(children[10].tagName).toBe('BUTTON');
    expect(children[10].textContent).toBe('1');
    expect(children.length - 7 - 3).toBe(31);
  });

  it('a Monday-first month with no lead has no blanks (Feb 2027 starts Monday)', () => {
    const { container } = render(<CalendarGrid items={[]} today="2027-02-10" />);
    const grid = container.querySelector('.grid-cols-7')!;
    expect(grid.children[7].tagName).toBe('BUTTON');
    expect(grid.children.length - 7).toBe(28);
  });

  it('a Sunday-first month leads with 6 blanks (Nov 2026 starts Sunday)', () => {
    const { container } = render(<CalendarGrid items={[]} today="2026-11-10" />);
    const grid = container.querySelector('.grid-cols-7')!;
    expect(grid.children[12].tagName).toBe('DIV');
    expect(grid.children[13].tagName).toBe('BUTTON');
  });

  it('defaults to today selected and lists its items; empty day says so', () => {
    render(<CalendarGrid items={[i({ title: 'Today EMI' })]} today={TODAY} />);
    expect(screen.getAllByText(formatDate(TODAY))).toHaveLength(2);
    expect(screen.getByText('Today EMI')).toBeInTheDocument();
  });

  it('selecting another day lists that day items, or "Nothing due"', async () => {
    render(
      <CalendarGrid items={[i({ title: 'Today EMI' }), i({ date: '2026-10-12', title: 'Later bill', type: 'card_bill' })]} today={TODAY} />
    );
    await userEvent.click(dayButton(12));
    expect(screen.getByText('Later bill')).toBeInTheDocument();
    expect(screen.queryByText('Today EMI')).toBeNull();
    await userEvent.click(dayButton(13));
    expect(screen.getByText('Nothing due on this day.')).toBeInTheDocument();
  });

  it('draws one dot per distinct kind on a day', () => {
    render(
      <CalendarGrid
        items={[
          i({ type: 'emi', date: '2026-10-15' }),
          i({ type: 'emi', date: '2026-10-15' }),
          i({ type: 'card_bill', date: '2026-10-15' }),
        ]}
        today={TODAY}
      />
    );
    expect(dayButton(15).querySelectorAll('.rounded-full')).toHaveLength(2);
    expect(dayButton(16).querySelectorAll('.rounded-full')).toHaveLength(0);
  });

  it('uses the kind colours', () => {
    render(
      <CalendarGrid
        items={['card_bill', 'emi', 'lending_due', 'statement_expected'].map((t, n) => i({ type: t as never, date: `2026-10-${20 + n}` }))}
        today={TODAY}
      />
    );
    expect(dayButton(20).querySelector('.bg-blue-500')).not.toBeNull();
    expect(dayButton(21).querySelector('.bg-amber-500')).not.toBeNull();
    expect(dayButton(22).querySelector('.bg-emerald-500')).not.toBeNull();
    expect(dayButton(23).querySelector('.bg-slate-400')).not.toBeNull();
  });

  it('ignores undated items', () => {
    render(<CalendarGrid items={[i({ date: null, title: 'Floating' })]} today={TODAY} />);
    expect(screen.queryByText('Floating')).toBeNull();
  });

  it('navigates months in both directions, across a year boundary', async () => {
    render(<CalendarGrid items={[]} today="2026-12-05" />);
    expect(screen.getByText(/December/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/January/)).toBeInTheDocument();
    expect(screen.getByText(/2027/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/November/)).toBeInTheDocument();
  });

  it('items on the selected day in another month show after navigating and selecting', async () => {
    render(<CalendarGrid items={[i({ date: '2026-11-03', title: 'Nov item' })]} today={TODAY} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    await userEvent.click(dayButton(3));
    expect(within(document.body).getByText('Nov item')).toBeInTheDocument();
  });

  it('highlights the matching card-bill row in the day list', () => {
    const { container } = render(
      <CalendarGrid items={[i({ type: 'card_bill', statementId: 'S1' })]} today={TODAY} highlightStatementId="S1" />
    );
    expect(container.querySelector('[data-bill-row="S1"]')!.className).toContain('ring-emerald-300');
  });
});
