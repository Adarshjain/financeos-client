import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpcomingCalendarView } from './UpcomingCalendarView';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _p, ...r }: { href: string; children?: React.ReactNode; prefetch?: boolean }) => (
    <a href={href} {...r}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/date-range', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
vi.mock('@/lib/query/hooks/useObligations', () => ({ useObligations: vi.fn() }));
vi.mock('@/features/bills/MarkPaidDialog', () => ({
  MarkPaidDialog: (p: { open: boolean; statementId: string }) =>
    p.open ? <div data-testid="mark-paid">{p.statementId}</div> : null,
}));
vi.mock('@/features/lendings/SettleDialog', () => ({
  SettleDialog: (p: { open: boolean; counterpartyId: string }) =>
    p.open ? <div data-testid="settle">{p.counterpartyId}</div> : null,
}));

import { useObligations } from '@/lib/query/hooks/useObligations';

const row = (o: Record<string, unknown>) => ({
  type: 'emi',
  status: 'upcoming',
  date: '2026-10-25',
  amount: 100,
  title: 'row',
  ...o,
});

const ITEMS = [
  row({ title: 'Home loan EMI #14', status: 'overdue', date: '2026-10-05', amount: 36603, loanId: 'L1', installmentSeq: 14, daysUntil: -8 }),
  row({ title: 'Amex Platinum Travel bill', type: 'card_bill', status: 'due_soon', date: '2026-10-15', amount: 33900, statementId: 'S1', accountName: 'Amex Platinum', daysUntil: 2 }),
  row({ title: 'Car EMI', date: '2026-10-15', amount: 17540, loanId: 'L2', installmentSeq: 3, daysUntil: 2 }),
  row({ title: 'You owe Priya Nair', type: 'lending_due', direction: 'borrowed', date: '2026-10-23', amount: 12000, counterpartyId: 'C2', counterpartyName: 'Priya Nair', daysUntil: 10 }),
  row({ title: 'HDFC Regalia Gold bill', type: 'card_bill', date: '2026-10-25', amount: 44319, statementId: 'S2', accountName: 'HDFC Regalia Gold', daysUntil: 12 }),
  row({ title: 'Rahul Sharma owes you', type: 'lending_due', direction: 'lent', date: '2026-10-28', amount: 15000, counterpartyId: 'C1', counterpartyName: 'Rahul Sharma', daysUntil: 15 }),
  row({ title: 'IDFC card bill', type: 'card_bill', date: null, amount: 8240, statementId: 'S3', daysUntil: null }),
  row({ title: 'Home loan EMI #15', date: '2026-11-05', amount: 36603, loanId: 'L1', installmentSeq: 15, daysUntil: 23 }),
  row({ title: 'Statement later', type: 'statement_expected', date: '2026-11-20', amount: null, accountId: 'A1', daysUntil: 38 }),
];

function mockQuery(over: Record<string, unknown> = {}) {
  vi.mocked(useObligations).mockReturnValue({
    data: ITEMS,
    error: null,
    isFetched: true,
    isPending: false,
    refetch: vi.fn(),
    ...over,
  } as never);
}

const day = (iso: string) => document.querySelector(`[data-date="${iso}"]`) as HTMLElement;
const selectedDay = () => document.querySelector('[data-selected]') as HTMLElement;

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  search = new URLSearchParams();
  mockQuery();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('CSS', { escape: (s: string) => s });
  replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
});

describe('header', () => {
  it('shows the month, its dated total and its overdue count', () => {
    render(<UpcomingCalendarView />);
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    // all October dated items: 36,603 + 33,900 + 17,540 + 12,000 + 44,319 + 15,000
    expect(screen.getByText('₹1,59,362 due · 1 overdue')).toBeInTheDocument();
  });

  it('stops Previous at the current month', () => {
    render(<UpcomingCalendarView />);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });

  it('Next moves a month, fetches to cover it, and writes ?month= to the URL', () => {
    render(<UpcomingCalendarView />);
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('₹36,603 due')).toBeInTheDocument();
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.stringMatching(/\?month=2026-11$/));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.not.stringContaining('month'));
  });

  it('starts from ?month= and queries enough months for it', () => {
    search = new URLSearchParams('month=2027-03');
    render(<UpcomingCalendarView />);
    expect(screen.getByText('March 2027')).toBeInTheDocument();
    expect(useObligations).toHaveBeenCalledWith(6);
  });

  it('stops Next at the last month that can be fetched (12 months)', () => {
    search = new URLSearchParams('month=2027-09');
    render(<UpcomingCalendarView />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(useObligations).toHaveBeenCalledWith(12);
  });

  it('follows the URL when a tab link clears ?month=', () => {
    search = new URLSearchParams('month=2026-11');
    const { rerender } = render(<UpcomingCalendarView />);
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    search = new URLSearchParams();
    rerender(<UpcomingCalendarView />);
    expect(screen.getByText('October 2026')).toBeInTheDocument();
  });
});

describe('events', () => {
  it('draws one chip per item on its day, name cut and short amount', () => {
    render(<UpcomingCalendarView />);
    expect(within(day('2026-10-05')).getByText('Home loan EM… ₹36.6K')).toBeInTheDocument();
    expect(within(day('2026-10-15')).getByText('Amex Platinu… ₹33.9K')).toBeInTheDocument();
    expect(within(day('2026-10-15')).getByText('Car EMI ₹17.54K')).toBeInTheDocument();
    expect(within(day('2026-10-28')).getByText('Rahul Sharma… +₹15K')).toBeInTheDocument();
    expect(within(day('2026-10-23')).getByText('You owe Priy… ₹12K')).toBeInTheDocument();
  });

  it('tones chips: overdue danger, due soon warning, lending info, money in success, scheduled neutral', () => {
    render(<UpcomingCalendarView />);
    const tone = (iso: string) => within(day(iso)).getByTitle(/₹/).className;
    expect(tone('2026-10-05')).toMatch(/danger/);
    expect(tone('2026-10-23')).toMatch(/info/);
    expect(tone('2026-10-28')).toMatch(/positive/);
    expect(tone('2026-10-25')).toMatch(/neutral/);
    expect(within(day('2026-10-15')).getByTitle('Amex Platinu… ₹33.9K').className).toMatch(/warning/);
  });

  it('does not draw other months or undated items', () => {
    render(<UpcomingCalendarView />);
    expect(screen.queryByText(/Home loan EM… ₹36.6K/, { selector: '[data-date="2026-11-05"] *' })).toBeNull();
    expect(document.querySelectorAll('[title]').length).toBe(6);
  });
});

describe('selected day', () => {
  it('starts on today with its empty message', () => {
    render(<UpcomingCalendarView />);
    expect(selectedDay().getAttribute('data-date')).toBe('2026-10-13');
    expect(screen.getByText('Tue 13 Oct')).toBeInTheDocument();
    expect(screen.getByText('Nothing due on this day.')).toBeInTheDocument();
  });

  it('clicking a day shows its title, count, total and the same rows with actions', () => {
    render(<UpcomingCalendarView />);
    fireEvent.click(day('2026-10-15'));
    expect(screen.getByText('Thu 15 Oct')).toBeInTheDocument();
    expect(screen.getByText('2 items · ₹51,440')).toBeInTheDocument();
    expect(screen.getByText('Amex Platinum Travel bill')).toBeInTheDocument();
    fireEvent.click(within(document.querySelector('[data-bill-row="S1"]') as HTMLElement).getByRole('button', { name: 'Mark paid' }));
    expect(screen.getByTestId('mark-paid')).toHaveTextContent('S1');
  });

  it('Settle opens for a lending row', () => {
    render(<UpcomingCalendarView />);
    fireEvent.click(day('2026-10-28'));
    fireEvent.click(screen.getByRole('button', { name: 'Settle' }));
    expect(screen.getByTestId('settle')).toHaveTextContent('C1');
  });

  it('selects the first day with items in a month that is not the current one', () => {
    search = new URLSearchParams('month=2026-11');
    render(<UpcomingCalendarView />);
    expect(selectedDay().getAttribute('data-date')).toBe('2026-11-05');
  });

  it('falls back to the 1st when the month has no items', () => {
    search = new URLSearchParams('month=2026-12');
    render(<UpcomingCalendarView />);
    expect(selectedDay().getAttribute('data-date')).toBe('2026-12-01');
    expect(screen.getByText('Nothing due on this day.')).toBeInTheDocument();
  });

  it('a chosen day is dropped when the month changes', () => {
    render(<UpcomingCalendarView />);
    fireEvent.click(day('2026-10-15'));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(selectedDay().getAttribute('data-date')).toBe('2026-11-05');
  });
});

describe('?bill=', () => {
  it('selects the bill day and outlines its row', () => {
    search = new URLSearchParams('bill=S2');
    render(<UpcomingCalendarView />);
    expect(selectedDay().getAttribute('data-date')).toBe('2026-10-25');
    expect(screen.getByText('Sun 25 Oct')).toBeInTheDocument();
    const el = document.querySelector('[data-bill-row="S2"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el).toHaveClass('bg-brand-tint');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('shows the bill month when it is not the shown one', () => {
    mockQuery({ data: [...ITEMS, row({ title: 'Later bill', type: 'card_bill', date: '2026-12-09', statementId: 'S9', amount: 500 })] });
    search = new URLSearchParams('bill=S9');
    render(<UpcomingCalendarView />);
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    expect(selectedDay().getAttribute('data-date')).toBe('2026-12-09');
  });
});

describe('loading and errors', () => {
  it('shows the skeleton while loading', () => {
    mockQuery({ data: undefined, isPending: true, isFetched: false });
    render(<UpcomingCalendarView />);
    expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull();
    expect(screen.queryByText('Nothing due on this day.')).toBeNull();
  });

  it('shows the failure banner with Try again when nothing loaded', () => {
    const refetch = vi.fn();
    mockQuery({ data: undefined, error: new Error('x'), refetch });
    render(<UpcomingCalendarView />);
    expect(screen.getByText('Failed to load upcoming items.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText('Nothing due on this day.')).toBeNull();
  });
});
