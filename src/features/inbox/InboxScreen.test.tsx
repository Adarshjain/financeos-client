import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }) }));

import { serverApi as api } from '@/lib/api/server';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxScreen } from './InboxScreen';
import { inbox, item } from './inboxTestUtils';

function seed(items: ReturnType<typeof item>[]) {
  vi.mocked(api.GET).mockResolvedValue({ data: inbox(items) } as never);
}

const bill = item({ key: 'bill:s1', kind: 'bill', title: 'Amex bill', subtitle: 'Due in 2 days', date: '2026-10-10', href: '/accounts/a1' });
const emi = item({ key: 'emi:l1:8', kind: 'emi', title: 'Car loan EMI', href: '/loans/l1' });
const review = item({
  key: 'review',
  kind: 'review',
  rowType: 'summary',
  section: 'needs_look',
  title: '25 transactions to review',
  count: 25,
  href: '/transactions?review=needs_review',
});
const grouped = item({
  key: 'page:/investments/nps',
  section: 'needs_look',
  title: 'NPS: 2 to review',
  subtitle: 'Link a payment · Record a debit',
  count: 2,
  href: '/investments/nps',
});

describe('InboxScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows section-shaped skeletons while loading', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => undefined) as never);
    renderWithQuery(<InboxScreen />);
    expect(screen.getByTestId('inbox-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('All clear')).not.toBeInTheDocument();
  });

  it('error: says what failed and Try again reloads', async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('boom'));
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByText("Couldn't load the inbox")).toBeInTheDocument();
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([bill]) } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Amex bill')).toBeInTheDocument();
  });

  it('empty: All clear with Upcoming and Transactions', async () => {
    seed([]);
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByText('All clear')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing needs you right now. New bills, statements and reviews show up here.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upcoming' })).toHaveAttribute('href', '/upcoming');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
  });

  it('renders Act now and Needs a look in order with counts, no summary line', async () => {
    seed([review, bill, emi]);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('Amex bill');
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(['Act now2', 'Needs a look1']);
    expect(screen.queryByText(/to act/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing urgent')).not.toBeInTheDocument();
  });

  it('does not show a section with no rows', async () => {
    seed([review]);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('25 transactions to review');
    expect(screen.queryByTestId('inbox-section-act_now')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-section-info')).not.toBeInTheDocument();
  });

  it('rows have no leading square', async () => {
    seed([bill, emi, review]);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('Amex bill');
    expect(screen.queryByText('2d')).not.toBeInTheDocument();
    expect(screen.queryByText('EMI')).not.toBeInTheDocument();
    expect(screen.queryByText('cap')).not.toBeInTheDocument();
  });

  it('every row is one link to its page, with no buttons', async () => {
    seed([bill, emi, review]);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('Amex bill');
    const rows = screen.getAllByTestId('inbox-row');
    expect(rows.map((r) => r.getAttribute('href'))).toEqual(['/accounts/a1', '/loans/l1', '/transactions?review=needs_review']);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText(/Swipe/)).not.toBeInTheDocument();
  });

  it('a grouped row shows its count and the full subtitle', async () => {
    seed([grouped]);
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByText('Link a payment · Record a debit')).toBeInTheDocument();
    expect(screen.getByText('NPS: 2 to review').closest('a')).toHaveAttribute('href', '/investments/nps');
  });

  it('never asks the server for link suggestions', async () => {
    seed([review]);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('25 transactions to review');
    expect(vi.mocked(api.GET).mock.calls.some((c) => String(c[0]).includes('link-suggestions'))).toBe(false);
  });

  it('?item= for a row that exists replaces the address with that row page', async () => {
    seed([bill, emi]);
    renderWithQuery(<InboxScreen highlightKey="emi:l1:8" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/loans/l1'));
  });

  it('?item= with no matching row stays on the Inbox without an error', async () => {
    seed([bill]);
    renderWithQuery(<InboxScreen highlightKey="gone" />);
    expect(await screen.findByText('Amex bill')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('That item is already handled.')).not.toBeInTheDocument();
  });

  it('refetches when the window regains focus', async () => {
    seed([bill]);
    const { queryClient } = renderWithQuery(<InboxScreen />);
    await screen.findByText('Amex bill');
    vi.mocked(api.GET).mockClear();
    seed([emi]);
    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(queryClient.getQueryData(keys.inbox.list())).toBeDefined();
  });
});
