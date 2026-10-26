import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('./InboxBillHost', () => ({
  InboxBillHost: ({ pending }: { pending: unknown }) => (
    <div data-testid="bill-host" data-pending={JSON.stringify(pending)} />
  ),
}));
// Swipe is a pointer gesture; the stub exposes what each side would do.
vi.mock('@/components/ds/SwipeActions/SwipeActions', () => ({
  SwipeActions: ({
    children,
    left,
    right,
    disabled,
  }: {
    children: React.ReactNode;
    left?: { onTrigger?: () => void };
    right?: { onTrigger?: () => void };
    disabled?: boolean;
  }) => (
    <div data-testid="swipe" data-disabled={String(Boolean(disabled))}>
      {left ? <button onClick={left.onTrigger}>swipe-right</button> : null}
      {right ? <button onClick={right.onTrigger}>swipe-left</button> : null}
      {children}
    </div>
  ),
}));

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxPage } from './InboxPage';
import { action, DISMISS, inbox, item, SNOOZE } from './inboxTestUtils';

function seed(items: ReturnType<typeof item>[]) {
  vi.mocked(api.GET).mockResolvedValue({ data: inbox(items) } as never);
}

const bill = item({
  key: 'bill:s1',
  kind: 'bill',
  title: 'Amex bill',
  subtitle: 'Due in 2 days',
  date: '2026-10-10',
  refs: { statementId: 's1' },
  actions: [action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } }), SNOOZE],
});
const emi = item({
  key: 'emi:l1:8',
  kind: 'emi',
  section: 'act_now',
  title: 'Car loan EMI',
  actions: [action({ type: 'open', label: 'Open', href: '/loans/l1' }), SNOOZE],
});
const review = item({
  key: 'review',
  kind: 'review',
  rowType: 'summary',
  section: 'needs_look',
  title: '25 transactions to review',
  count: 25,
  actions: [action({ type: 'review', label: 'Review', href: '/transactions/review' }), DISMISS],
});
const reward = item({
  key: 'reward:1',
  kind: 'reward_cap',
  section: 'needs_look',
  severity: 'info',
  title: 'Amex dining cap',
  refs: { accountId: 'acc-1' },
  actions: [action({ type: 'open', label: 'Open', href: '/rewards' }), DISMISS],
});
const update = item({ key: 'job:9', kind: 'job', section: 'info', severity: 'info', title: 'Statement imported', actions: [DISMISS] });
const prices = item({ key: 'job:2', kind: 'job', section: 'needs_look', severity: 'info', title: 'Prices refreshed', actions: [DISMISS] });

describe('InboxPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows section-shaped skeletons while loading', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => undefined) as never);
    renderWithQuery(<InboxPage />);
    expect(screen.getByTestId('inbox-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('All clear')).not.toBeInTheDocument();
  });

  it('error: says what failed and Try again reloads', async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new Error('boom'));
    renderWithQuery(<InboxPage />);
    expect(await screen.findByText("Couldn't load the inbox")).toBeInTheDocument();
    expect(screen.getByText('The server did not answer. Your items are safe.')).toBeInTheDocument();
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([bill]) } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Amex bill')).toBeInTheDocument();
  });

  it('empty: All clear with Upcoming and Transactions', async () => {
    seed([]);
    renderWithQuery(<InboxPage />);
    expect(await screen.findByText('All clear')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing needs you right now. New bills, statements and reviews show up here.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
    expect(push).toHaveBeenLastCalledWith('/ds/upcoming');
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(push).toHaveBeenLastCalledWith('/transactions');
  });

  it('renders Act now and Needs a look in order with counts, no Updates, no summary line', async () => {
    seed([update, review, bill, emi]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(['Act now2', 'Needs a look1']);
    expect(screen.queryByText('Statement imported')).not.toBeInTheDocument();
    expect(screen.queryByText(/to act/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing urgent')).not.toBeInTheDocument();
  });

  it('only Updates rows: shows the empty state', async () => {
    seed([update]);
    renderWithQuery(<InboxPage />);
    expect(await screen.findByText('All clear')).toBeInTheDocument();
    expect(screen.queryByText('Statement imported')).not.toBeInTheDocument();
  });

  it('does not show a section with no rows', async () => {
    seed([review]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('25 transactions to review');
    expect(screen.queryByTestId('inbox-section-act_now')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-section-info')).not.toBeInTheDocument();
  });

  it('rows have no leading square', async () => {
    seed([bill, emi, review, reward]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    expect(screen.queryByText('2d')).not.toBeInTheDocument();
    expect(screen.queryByText('EMI')).not.toBeInTheDocument();
    expect(screen.queryByText('cap')).not.toBeInTheDocument();
  });

  it('buttons: Mark paid secondary; Open, Review and Rewards links to their targets', async () => {
    seed([bill, emi, review, reward]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/ds/loans/l1');
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/transactions/review');
    expect(screen.getByRole('link', { name: 'Rewards' })).toHaveAttribute('href', '/ds/accounts/acc-1/rewards');
  });

  it('snooze and dismiss icons follow the server actions', async () => {
    seed([bill, review, prices]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    expect(screen.getByRole('button', { name: 'Snooze Amex bill' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss Amex bill' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Snooze 25 transactions/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss 25 transactions to review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss Prices refreshed' })).toBeInTheDocument();
  });

  it('a bill button opens the bill dialogs for its statement', async () => {
    seed([bill]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    expect(screen.getByTestId('bill-host')).toHaveAttribute('data-pending', 'null');
    fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    expect(JSON.parse(screen.getByTestId('bill-host').getAttribute('data-pending')!)).toEqual({
      type: 'mark_paid',
      statementId: 's1',
    });
  });

  it('dismiss removes the row at once, toasts with Undo, and Undo restores it', async () => {
    seed([review, prices]);
    vi.mocked(api.POST).mockResolvedValue({} as never);
    vi.mocked(api.DELETE).mockResolvedValue({} as never);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Prices refreshed');
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([review]) } as never); // the server's answer once it is gone
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Prices refreshed' }));
    await waitFor(() => expect(screen.queryByText('Prices refreshed')).not.toBeInTheDocument());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'job:2' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Dismissed', expect.anything()));
    const { action: undo } = showToast.mock.calls[0][1];
    expect(undo.label).toBe('Undo');
    await act(async () => undo.onSelect());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/inbox/{key}/state', { params: { path: { key: 'job:2' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Restored'));
  });

  it('snooze preset hides the row, toasts the date with Undo', async () => {
    seed([bill, review]);
    vi.mocked(api.POST).mockResolvedValue({} as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    await user.click(screen.getByRole('button', { name: 'Snooze Amex bill' }));
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([review]) } as never); // the server's answer once it is gone
    await user.click(await screen.findByText('In 3 days'));
    await waitFor(() => expect(screen.queryByText('Amex bill')).not.toBeInTheDocument());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/snooze', {
      params: { path: { key: 'bill:s1' } },
      body: { until: '2026-10-11' },
    });
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Snoozed until 11 Oct', expect.objectContaining({ action: expect.anything() })),
    );
  });

  it('a failed snooze puts the row back with the board copy', async () => {
    seed([bill]);
    vi.mocked(api.POST).mockRejectedValue(new Error('nope'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    await user.click(screen.getByRole('button', { name: 'Snooze Amex bill' }));
    await user.click(await screen.findByText('Tomorrow'));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Couldn't snooze. The row is back.", { tone: 'danger' }),
    );
    expect(await screen.findByText('Amex bill')).toBeInTheDocument();
  });

  it('a failed dismiss puts the row back with the board copy', async () => {
    seed([prices]);
    vi.mocked(api.POST).mockRejectedValue(new Error('nope'));
    renderWithQuery(<InboxPage />);
    await screen.findByText('Prices refreshed');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Prices refreshed' }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Couldn't dismiss. The row is back.", { tone: 'danger' }),
    );
    expect(await screen.findByText('Prices refreshed')).toBeInTheDocument();
  });

  it('swipe right snoozes until tomorrow, swipe left dismisses, only where allowed', async () => {
    seed([bill, prices]);
    vi.mocked(api.POST).mockResolvedValue({} as never);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    const billSwipe = screen.getByText('Amex bill').closest('[data-testid="swipe"]') as HTMLElement;
    const pricesSwipe = screen.getByText('Prices refreshed').closest('[data-testid="swipe"]') as HTMLElement;
    expect(within(billSwipe).queryByText('swipe-left')).not.toBeInTheDocument();
    expect(within(pricesSwipe).queryByText('swipe-right')).not.toBeInTheDocument();
    fireEvent.click(within(billSwipe).getByText('swipe-right'));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/snooze', {
        params: { path: { key: 'bill:s1' } },
        body: { until: '2026-10-09' },
      }),
    );
    fireEvent.click(within(pricesSwipe).getByText('swipe-left'));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'job:2' } } }),
    );
  });

  it('a row that cannot be snoozed or dismissed does not swipe', async () => {
    seed([item({ key: 'k', kind: 'gmail_reconnect', title: 'Reconnect Gmail', actions: [action({ type: 'reconnect', label: 'Reconnect', href: '/settings/gmail' })] })]);
    renderWithQuery(<InboxPage />);
    const row = (await screen.findByText('Reconnect Gmail')).closest('[data-testid="swipe"]') as HTMLElement;
    expect(row).toHaveAttribute('data-disabled', 'true');
  });

  it('shows the phone swipe hint under the list', async () => {
    seed([bill]);
    renderWithQuery(<InboxPage />);
    await screen.findByText('Amex bill');
    expect(screen.getByText('Swipe')).toBeInTheDocument();
    expect(
      screen.getByText(/a row right to snooze it until tomorrow, left to dismiss it/),
    ).toBeInTheDocument();
  });

  it('?item= highlights the row and scrolls it into view', async () => {
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => undefined);
    seed([bill, emi]);
    renderWithQuery(<InboxPage highlightKey="emi:l1:8" />);
    await screen.findByText('Car loan EMI');
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    const row = screen.getByText('Car loan EMI').closest('[data-testid="inbox-row"]') as HTMLElement;
    expect(row.className).toContain('bg-brand-tint');
    const other = screen.getByText('Amex bill').closest('[data-testid="inbox-row"]') as HTMLElement;
    expect(other.className).not.toContain('bg-brand-tint');
    expect(screen.queryByText('That item is already handled.')).not.toBeInTheDocument();
  });

  it('?item= with no matching row shows the already-handled Banner', async () => {
    seed([bill]);
    renderWithQuery(<InboxPage highlightKey="gone" />);
    expect(await screen.findByText('That item is already handled.')).toBeInTheDocument();
  });

  it('refetches when the window regains focus', async () => {
    seed([bill]);
    const { queryClient } = renderWithQuery(<InboxPage />);
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
