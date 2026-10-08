import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('../InboxBillDialogs', async () => {
  const actual = await vi.importActual<typeof import('../InboxBillDialogs')>('../InboxBillDialogs');
  return {
    ...actual,
    InboxBillDialogs: ({ pending }: { pending: unknown }) => (
      <div data-testid="bill-dialogs" data-pending={JSON.stringify(pending)} />
    ),
  };
});

import { api } from '@/lib/api/client';
import type { InboxItemResponse, InboxResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxView } from '../InboxView';
import { action, DISMISS, item, SNOOZE } from './fixtures';

function inbox(items: InboxItemResponse[], summary?: InboxResponse['summary']): InboxResponse {
  return {
    generatedAt: '2026-10-08T00:00:00Z',
    items,
    summary: summary ?? {
      actNow: items.filter((i) => i.section === 'act_now').length,
      needsLook: items.filter((i) => i.section === 'needs_look').length,
      info: items.filter((i) => i.section === 'info').length,
      badge: items.filter((i) => i.section !== 'info').length,
    },
  };
}
function seed(data: InboxResponse) {
  vi.mocked(api.GET).mockResolvedValue({ data } as never);
}

const billItem = item({
  key: 'card_bill:s1:OVERDUE',
  section: 'act_now',
  title: 'HDFC overdue',
  refs: { statementId: 's1' },
  actions: [action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } }), SNOOZE, DISMISS],
});
const lookItem = item({ key: 'emi:l1:3', section: 'needs_look', title: 'EMI soon', actions: [SNOOZE, DISMISS] });
const infoItem = item({ key: 'reward:1', section: 'info', title: 'Cap reached', severity: 'info', actions: [DISMISS] });

describe('InboxView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows a skeleton while loading, no empty state', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    const { container } = renderWithQuery(<InboxView />);
    expect(container.querySelector('[class*="animate-pulse"]')).not.toBeNull();
    expect(screen.queryByText('All clear')).not.toBeInTheDocument();
  });

  it('shows the error message when the request fails', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('boom'));
    renderWithQuery(<InboxView />);
    expect(await screen.findByText(/Couldn't load the inbox/)).toBeInTheDocument();
  });

  it('empty list: All clear with Upcoming and Transactions links, no counts', async () => {
    seed(inbox([]));
    renderWithQuery(<InboxView />);
    expect(await screen.findByText('All clear')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upcoming' })).toHaveAttribute('href', '/upcoming');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
    expect(screen.queryByTestId('inbox-counts')).not.toBeInTheDocument();
  });

  it('renders sections in order act now, needs a look, info, with the counts header', async () => {
    seed(inbox([infoItem, lookItem, billItem]));
    renderWithQuery(<InboxView />);
    await screen.findByText('HDFC overdue');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Act now (1)', 'Needs a look (1)', 'Info (1)']);
    expect(screen.getByTestId('inbox-counts')).toHaveTextContent('1 to act · 1 to look');
  });

  it('hides sections that have no rows', async () => {
    seed(inbox([lookItem]));
    renderWithQuery(<InboxView />);
    await screen.findByText('EMI soon');
    expect(screen.queryByTestId('inbox-section-act_now')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-section-info')).not.toBeInTheDocument();
    expect(screen.getByTestId('inbox-section-needs_look')).toBeInTheDocument();
  });

  it('info-only list shows "Nothing urgent"', async () => {
    seed(inbox([infoItem]));
    renderWithQuery(<InboxView />);
    expect(await screen.findByTestId('inbox-counts')).toHaveTextContent('Nothing urgent');
  });

  it('a bill action opens the bill dialogs for its statement', async () => {
    seed(inbox([billItem]));
    renderWithQuery(<InboxView />);
    await screen.findByText('HDFC overdue');
    expect(screen.getByTestId('bill-dialogs')).toHaveAttribute('data-pending', 'null');
    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('bill-dialogs').getAttribute('data-pending')!)).toMatchObject({
        type: 'mark_paid',
        statementId: 's1',
      }),
    );
  });

  it('dismiss POSTs with the raw key and the row disappears optimistically', async () => {
    seed(inbox([billItem, lookItem]));
    // Keep the request in flight: removal must not wait for the server.
    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<InboxView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss HDFC overdue' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/dismiss', { params: { path: { key: 'card_bill:s1:OVERDUE' } } }),
    );
    await waitFor(() => expect(screen.queryByText('HDFC overdue')).not.toBeInTheDocument());
    expect(screen.getByText('EMI soon')).toBeInTheDocument();
  });

  it('snooze preset POSTs the until date for that row', async () => {
    seed(inbox([lookItem]));
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
    renderWithQuery(<InboxView />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Snooze EMI soon' }));
    await user.click(await screen.findByRole('menuitem', { name: 'In 3 days' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/inbox/{key}/snooze', {
        params: { path: { key: 'emi:l1:3' } },
        body: { until: '2026-10-11' },
      }),
    );
  });

  describe('?item= deep link', () => {
    it('highlights and scrolls to a listed row; no handled note', async () => {
      const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
      seed(inbox([billItem, lookItem]));
      const { container } = renderWithQuery(<InboxView highlightKey="emi:l1:3" />);
      await screen.findByText('EMI soon');
      await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'center' }));
      expect(scroll.mock.contexts.at(-1)).toHaveProperty('id', 'inbox-row-emi:l1:3');
      expect(container.querySelectorAll('.ring-emerald-500\\/40')).toHaveLength(1);
      expect(screen.queryByTestId('inbox-handled-note')).not.toBeInTheDocument();
      scroll.mockRestore();
    });

    it('a key that is not listed shows "That item is already handled" and highlights nothing', async () => {
      seed(inbox([billItem]));
      const { container } = renderWithQuery(<InboxView highlightKey="gone:key" />);
      expect(await screen.findByTestId('inbox-handled-note')).toHaveTextContent('That item is already handled');
      expect(container.querySelectorAll('.ring-emerald-500\\/40')).toHaveLength(0);
    });

    it('no highlightKey: no note, no highlight', async () => {
      seed(inbox([billItem]));
      const { container } = renderWithQuery(<InboxView />);
      await screen.findByText('HDFC overdue');
      expect(screen.queryByTestId('inbox-handled-note')).not.toBeInTheDocument();
      expect(container.querySelectorAll('.ring-emerald-500\\/40')).toHaveLength(0);
    });

    it('acting on the highlighted row later does not flip it to "already handled"', async () => {
      seed(inbox([billItem, lookItem]));
      vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
      renderWithQuery(<InboxView highlightKey="emi:l1:3" />);
      await screen.findByText('EMI soon');
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss EMI soon' }));
      await waitFor(() => expect(screen.queryByText('EMI soon')).not.toBeInTheDocument());
      expect(screen.queryByTestId('inbox-handled-note')).not.toBeInTheDocument();
    });

    it('an empty loaded list flags the key as already handled', async () => {
      seed(inbox([]));
      renderWithQuery(<InboxView highlightKey="x" />);
      // Empty but loaded: the key is not in the list, so it is flagged.
      expect(await screen.findByTestId('inbox-handled-note')).toBeInTheDocument();
      expect(within(document.body).getByText('All clear')).toBeInTheDocument();
    });
  });
});
