import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpcomingCalendarScreen } from './UpcomingCalendarScreen';
import { UpcomingScreen } from './UpcomingScreen';

let search = new URLSearchParams();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/date-range', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
vi.mock('@/lib/query/hooks/useObligations', () => ({ useObligations: vi.fn() }));
vi.mock('@/lib/query/hooks/useRecurringProposals', () => ({ useRecurringProposals: vi.fn() }));
const actions = { track: vi.fn(), dismiss: vi.fn(), stop: vi.fn(), converted: vi.fn() };
vi.mock('./useRecurringActions', () => ({ useRecurringActions: () => actions }));
vi.mock('./RegularPaymentsCard', () => ({
  RegularPaymentsCard: (p: { proposals: unknown[] }) => <div data-testid="found">{p.proposals.length}</div>,
}));
vi.mock('@/features/bills/MarkPaidDialog', () => ({ MarkPaidDialog: () => null }));
vi.mock('@/features/inbox/InboxBillHost', () => ({ InboxBillHost: () => null }));
vi.mock('@/features/lendings/SettleDialog', () => ({ SettleDialog: () => null }));

import { useObligations } from '@/lib/query/hooks/useObligations';
import { useRecurringProposals } from '@/lib/query/hooks/useRecurringProposals';

const item = (o: Record<string, unknown>) => ({
  type: 'recurring',
  status: 'upcoming',
  date: '2026-10-20',
  amount: 649,
  title: 'Netflix',
  accountName: 'HDFC Regalia',
  seriesId: 'S1',
  paid: false,
  daysUntil: 7,
  href: '/upcoming?recurring=S1',
  ...o,
});

function mock(items: unknown[], proposals: unknown[] = []) {
  vi.mocked(useObligations).mockReturnValue({ data: items, error: null, isFetched: true, isPending: false, refetch: vi.fn() } as never);
  vi.mocked(useRecurringProposals).mockReturnValue({ data: proposals } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  search = new URLSearchParams();
});

describe('Upcoming with regular payments', () => {
  it('shows the found card only when there are proposals', () => {
    mock([item({})], [{ id: 'r1' }]);
    const { unmount } = render(<UpcomingScreen />);
    expect(screen.getByTestId('found')).toHaveTextContent('1');
    unmount();
    mock([item({})], []);
    render(<UpcomingScreen />);
    expect(screen.queryByTestId('found')).toBeNull();
  });

  it('renders a tracked row without navigating, with Stop tracking in its menu', async () => {
    mock([item({})]);
    render(<UpcomingScreen />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByText('Netflix'));
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Stop tracking' }));
    expect(actions.stop).toHaveBeenCalledWith('S1', 'Netflix');
  });

  it('shows Paid for a paid row', () => {
    mock([item({ paid: true })]);
    render(<UpcomingScreen />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('filters by Regular payments', async () => {
    mock([item({}), item({ type: 'emi', title: 'Car EMI', seriesId: null, loanId: 'L1', installmentSeq: 1 })]);
    render(<UpcomingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Regular payments' }));
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByText('Car EMI')).toBeNull();
  });

  it('the calendar lists a recurring row on its day without crashing', async () => {
    mock([item({})]);
    render(<UpcomingCalendarScreen />);
    await userEvent.click(document.querySelector('[data-date="2026-10-20"]') as HTMLElement);
    expect((await screen.findAllByText(/Netflix/)).length).toBeGreaterThan(0);
    await userEvent.click(await screen.findByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Stop tracking' }));
    expect(actions.stop).toHaveBeenCalledWith('S1', 'Netflix');
  });
});
