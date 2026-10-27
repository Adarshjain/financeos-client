import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpcomingView } from './UpcomingView';

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
  MarkPaidDialog: (p: { open: boolean; statementId: string; cardName: string; remaining: number | null }) =>
    p.open ? (
      <div data-testid="mark-paid">
        {p.statementId}|{p.cardName}|{String(p.remaining)}
      </div>
    ) : null,
}));
vi.mock('@/features/inbox/InboxBillHost', () => ({
  InboxBillHost: (p: { pending: { type: string; statementId: string } | null }) =>
    p.pending ? (
      <div data-testid="bill-host">
        {p.pending.type}|{p.pending.statementId}
      </div>
    ) : null,
}));
vi.mock('@/features/lendings/SettleDialog', () => ({
  SettleDialog: (p: { open: boolean; counterpartyId: string; name: string; direction: string; balance: number }) =>
    p.open ? (
      <div data-testid="settle">
        {p.counterpartyId}|{p.name}|{p.direction}|{p.balance}
      </div>
    ) : null,
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
  row({ title: 'SBI Cashback statement expected', type: 'statement_expected', status: 'overdue', date: '2026-10-03', amount: null, accountId: 'A1', accountName: 'SBI Cashback', daysUntil: -10 }),
  row({ title: 'Home loan EMI #14', status: 'overdue', date: '2026-10-05', amount: 36603, loanId: 'L1', installmentSeq: 14, daysUntil: -8 }),
  row({ title: 'Amex Platinum Travel bill', type: 'card_bill', status: 'due_soon', date: '2026-10-15', amount: 33900, statementId: 'S1', accountName: 'Amex Platinum', daysUntil: 2 }),
  row({ title: 'You owe Priya Nair', type: 'lending_due', direction: 'borrowed', date: '2026-10-23', amount: 12000, counterpartyId: 'C2', counterpartyName: 'Priya Nair', daysUntil: 10 }),
  row({ title: 'HDFC Regalia Gold bill', type: 'card_bill', date: '2026-10-25', amount: 44319, statementId: 'S2', accountName: 'HDFC Regalia Gold', daysUntil: 12 }),
  row({ title: 'Rahul Sharma owes you', type: 'lending_due', direction: 'lent', date: '2026-10-28', amount: 15000, counterpartyId: 'C1', counterpartyName: 'Rahul Sharma', daysUntil: 15 }),
  row({ title: 'IDFC card bill', type: 'card_bill', date: null, amount: 8240, statementId: 'S3', daysUntil: null }),
  row({ title: 'Home loan EMI #15', date: '2026-11-05', amount: 36603, loanId: 'L1', installmentSeq: 15, daysUntil: 23 }),
  row({ title: 'Car loan EMI #9', date: '2026-12-07', amount: 17748, loanId: 'L2', installmentSeq: 9, daysUntil: 55 }),
  row({ title: 'Car loan EMI #10', date: '2026-12-08', amount: 100, loanId: 'L2', installmentSeq: 10, daysUntil: 56 }),
  row({ title: 'Car loan EMI #11', date: '2027-01-08', amount: 200, loanId: 'L2', installmentSeq: 11, daysUntil: 87 }),
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

const tile = (id: string) => screen.queryByTestId(`tile-${id}`);

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  search = new URLSearchParams();
  mockQuery();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('CSS', { escape: (s: string) => s });
  replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
});

describe('UpcomingView totals', () => {
  it('shows the four tiles with captions', () => {
    render(<UpcomingView />);
    expect(within(tile('overdue')!).getByText('₹36,603')).toBeInTheDocument();
    expect(within(tile('overdue')!).getByText('1 EMI · 1 statement')).toBeInTheDocument();
    expect(within(tile('next7')!).getByText('₹33,900')).toBeInTheDocument();
    expect(within(tile('next7')!).getByText('1 card bill')).toBeInTheDocument();
    expect(within(tile('month')!).getByText('4 items')).toBeInTheDocument();
    expect(within(tile('dueBack')!).getByText('+₹15,000')).toBeInTheDocument();
    expect(within(tile('dueBack')!).getByText('Rahul · 28 Oct')).toBeInTheDocument();
  });

  it('follow the filter and hide a tile with nothing in it', () => {
    render(<UpcomingView />);
    fireEvent.click(screen.getByRole('button', { name: 'EMIs' }));
    expect(tile('overdue')).not.toBeNull();
    expect(tile('next7')).toBeNull();
    expect(tile('dueBack')).toBeNull();
  });
});

describe('UpcomingView filters and range', () => {
  it('a kind chip filters the list in place and writes ?kind= to the URL', () => {
    render(<UpcomingView />);
    fireEvent.click(screen.getByRole('button', { name: 'Card bills' }));
    expect(screen.queryByText('Home loan EMI #14')).toBeNull();
    expect(screen.getByText('HDFC Regalia Gold bill')).toBeInTheDocument();
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.stringMatching(/\?kind=card_bill$/));
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.not.stringContaining('kind'));
  });

  it('starts from the URL state and queries that many months', () => {
    search = new URLSearchParams('kind=emi&months=6');
    render(<UpcomingView />);
    expect(useObligations).toHaveBeenCalledWith(6);
    expect(screen.queryByText('HDFC Regalia Gold bill')).toBeNull();
    expect(screen.getByText('Home loan EMI #14')).toBeInTheDocument();
  });

  it('defaults to 3 months and the range Select refetches with the picked range and updates the URL', async () => {
    render(<UpcomingView />);
    expect(useObligations).toHaveBeenLastCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Range' }));
    await userEvent.click(await screen.findByText('6 months'));
    expect(useObligations).toHaveBeenLastCalledWith(6);
    expect(replaceState).toHaveBeenLastCalledWith(null, '', expect.stringMatching(/\?months=6$/));
  });
});

describe('UpcomingView list', () => {
  it('orders sections Overdue, Next 7 days, Later this month, Due date unknown, then months', () => {
    render(<UpcomingView />);
    const text = document.body.textContent!;
    const order = ['Overdue · 2', 'Next 7 days · 1', 'Later this month · 3', 'Due date unknown · 1', 'November · 1'].map((h) => text.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('shows the section total on the right of its header', () => {
    render(<UpcomingView />);
    expect(screen.getByText('Overdue · 2').parentElement).toHaveTextContent('₹36,603');
    expect(screen.getByText('Due date unknown · 1').parentElement).toHaveTextContent('₹8,240');
  });

  it('folds months after the first into one line that expands in place', () => {
    render(<UpcomingView />);
    expect(screen.getByText('Home loan EMI #15')).toBeInTheDocument();
    expect(screen.queryByText('Car loan EMI #9')).toBeNull();
    const folded = screen.getByTestId('folded-2026-12');
    expect(folded).toHaveTextContent('December · 2 · ₹17,848');
    expect(screen.getByTestId('folded-2027-01')).toHaveTextContent('January · 1 · ₹200');
    fireEvent.click(within(folded).getByRole('button', { name: /Show/ }));
    expect(screen.getByText('Car loan EMI #9')).toBeInTheDocument();
    expect(screen.getByText('December · 2')).toBeInTheDocument();
    expect(screen.queryByTestId('folded-2026-12')).toBeNull();
    expect(screen.queryByText('Car loan EMI #11')).toBeNull();
  });

  it('subtitles carry days and account; undated says the date is unknown; undated has a dash instead of a date', () => {
    render(<UpcomingView />);
    expect(screen.getByText(/10 days overdue · SBI Cashback/)).toBeInTheDocument();
    expect(screen.getByText(/in 2 days · Amex Platinum/)).toBeInTheDocument();
    expect(screen.getByText('Due date unknown')).toBeInTheDocument();
  });
});

describe('UpcomingView row trailing', () => {
  it('Overdue word only on an overdue row with no amount; Due soon on a card bill due within 7 days', () => {
    render(<UpcomingView />);
    expect(screen.getAllByText('Overdue', { selector: 'span.text-warning' })).toHaveLength(1);
    // desktop word + phone word
    expect(screen.getAllByText('Due soon', { selector: 'span.text-warning' })).toHaveLength(2);
  });

  it('amount tones: overdue danger, owed to you "+" green, none a dash', () => {
    render(<UpcomingView />);
    expect(screen.getAllByText('₹36,603')[0]).toHaveClass('text-danger');
    expect(screen.getAllByText('+₹15,000', { selector: 'span.text-positive' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('Mark paid is primary in Next 7 days and secondary later', () => {
    render(<UpcomingView />);
    const buttons = screen.getAllByRole('button', { name: 'Mark paid' });
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveClass('bg-brand');
    expect(buttons[1]).not.toHaveClass('bg-brand');
    expect(buttons[1]).toHaveClass('border-line-strong');
  });

  it('Mark paid opens the dialog with that bill', () => {
    render(<UpcomingView />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark paid' })[0]);
    expect(screen.getByTestId('mark-paid')).toHaveTextContent('S1|Amex Platinum|33900');
  });

  it('Upload links to the live import page for the account', () => {
    render(<UpcomingView />);
    expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('href', '/transactions/import?account=A1');
  });

  it('lending rows get Settle plus a chevron to the person; Settle opens the sheet with direction and balance', () => {
    render(<UpcomingView />);
    expect(screen.getAllByRole('button', { name: 'Settle' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Open' }).map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/loans/lendings/C1', '/loans/lendings/C2']),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Settle' })[1]);
    expect(screen.getByTestId('settle')).toHaveTextContent('C1|Rahul Sharma|lent|15000');
    fireEvent.click(screen.getAllByRole('button', { name: 'Settle' })[0]);
    expect(screen.getByTestId('settle')).toHaveTextContent('C2|Priya Nair|borrowed|12000');
  });

  it('EMI rows link to the loan with the installment; card bills have no chevron', () => {
    render(<UpcomingView />);
    expect(screen.getAllByRole('link', { name: 'Open' }).map((a) => a.getAttribute('href'))).toContain('/loans/L1?installment=14');
    expect(screen.getAllByRole('link', { name: 'Open' })).toHaveLength(4);
  });

  it('shows no type badges', () => {
    render(<UpcomingView />);
    expect(screen.queryByText('Loan EMI')).toBeNull();
    expect(screen.queryByText('Statement')).toBeNull();
  });
});

describe('UpcomingView ?bill= deep link', () => {
  it('highlights the bill row and scrolls it into view', () => {
    search = new URLSearchParams('bill=S2');
    render(<UpcomingView />);
    const el = document.querySelector('[data-bill-row="S2"]')!;
    expect(el).toHaveClass('bg-brand-tint');
    expect(document.querySelector('[data-bill-row="S1"]')).not.toHaveClass('bg-brand-tint');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('shows a folded month when the bill sits in it', () => {
    mockQuery({ data: [...ITEMS, row({ title: 'Folded bill', type: 'card_bill', statementId: 'S9', date: '2026-12-20', amount: 5 })] });
    search = new URLSearchParams('bill=S9');
    render(<UpcomingView />);
    expect(screen.getByText('Folded bill')).toBeInTheDocument();
    expect(document.querySelector('[data-bill-row="S9"]')).toHaveClass('bg-brand-tint');
  });
});

describe('UpcomingView states', () => {
  it('a failed load shows the banner under the filters with Try again, filters staying', () => {
    const refetch = vi.fn();
    mockQuery({ data: undefined, error: new Error('x'), refetch });
    render(<UpcomingView />);
    expect(screen.getByText('Failed to load upcoming items.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Card bills' })).toBeInTheDocument();
    expect(screen.queryByText(/Nothing scheduled/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('nothing in range reads "Nothing scheduled within the next N months."', () => {
    mockQuery({ data: [] });
    render(<UpcomingView />);
    expect(screen.getByText('Nothing scheduled within the next 3 months.')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-overdue')).toBeNull();
  });

  it('a kind filter with no rows says so and Clear filters shows every kind again', () => {
    search = new URLSearchParams('kind=card_bill');
    mockQuery({ data: [row({ type: 'emi' })] });
    render(<UpcomingView />);
    expect(screen.getByText('Nothing of this kind within the next 3 months.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByText(/Nothing of this kind/)).toBeNull();
  });

  it('no filter and no rows has no Clear filters action', () => {
    mockQuery({ data: [] });
    render(<UpcomingView />);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('singular month', () => {
    search = new URLSearchParams('months=1');
    mockQuery({ data: [] });
    render(<UpcomingView />);
    expect(screen.getByText('Nothing scheduled within the next 1 month.')).toBeInTheDocument();
  });

  it('loading shows skeleton tiles and rows, no filters', () => {
    mockQuery({ data: undefined, isPending: true, isFetched: false });
    render(<UpcomingView />);
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull();
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(8);
  });
});

describe('UpcomingView URL as the source of truth', () => {
  it('drops the filter and range when the URL is cleared from outside (the active tab link)', () => {
    search = new URLSearchParams('kind=emi&months=6');
    const { rerender } = render(<UpcomingView />);
    expect(screen.queryByText('HDFC Regalia Gold bill')).toBeNull();
    search = new URLSearchParams();
    rerender(<UpcomingView />);
    expect(screen.getByText('HDFC Regalia Gold bill')).toBeInTheDocument();
    expect(useObligations).toHaveBeenLastCalledWith(3);
  });

  it('keeps a filter the user just picked until the URL itself changes', () => {
    const { rerender } = render(<UpcomingView />);
    fireEvent.click(screen.getByRole('button', { name: 'EMIs' }));
    rerender(<UpcomingView />);
    expect(screen.queryByText('HDFC Regalia Gold bill')).toBeNull();
  });
});

describe('UpcomingView Set details', () => {
  it('an undated card bill has Set details, which opens the bill dialog host with its statement', () => {
    render(<UpcomingView />);
    fireEvent.click(screen.getByRole('button', { name: 'Set details' }));
    expect(screen.getByTestId('bill-host')).toHaveTextContent('set_details|S3');
  });

  it('dated bills do not have it', () => {
    render(<UpcomingView />);
    expect(screen.getAllByRole('button', { name: 'Set details' })).toHaveLength(1);
  });
});
