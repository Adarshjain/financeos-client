import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
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

import { INBOX_WIDGET_ROW_LIMIT, InboxWidget, inboxWidgetRows } from '../InboxWidget';
import { inboxItemHref } from '../InboxWidgetRow';
import { action, DISMISS, item, SNOOZE } from './fixtures';

function seed(items: InboxItemResponse[], summary?: InboxResponse['summary']) {
  const data: InboxResponse = {
    generatedAt: '2026-10-08T00:00:00Z',
    items,
    summary: summary ?? {
      actNow: items.filter((i) => i.section === 'act_now').length,
      needsLook: items.filter((i) => i.section === 'needs_look').length,
      info: items.filter((i) => i.section === 'info').length,
      badge: items.filter((i) => i.section !== 'info').length,
    },
  };
  vi.mocked(api.GET).mockResolvedValue({ data } as never);
}
const mk = (key: string, section: string, over: Partial<InboxItemResponse> = {}) =>
  item({ key, section, title: `T-${key}`, ...over });

describe('inboxWidgetRows', () => {
  it('lists act_now first then needs_look, preserving order, excluding info', () => {
    const rows = inboxWidgetRows([mk('n1', 'needs_look'), mk('i1', 'info'), mk('a1', 'act_now'), mk('a2', 'act_now')]);
    expect(rows.map((r) => r.key)).toEqual(['a1', 'a2', 'n1']);
  });
  it('caps at the limit (4 by default)', () => {
    expect(INBOX_WIDGET_ROW_LIMIT).toBe(4);
    const items = ['1', '2', '3'].map((k) => mk(`a${k}`, 'act_now')).concat(['1', '2', '3'].map((k) => mk(`n${k}`, 'needs_look')));
    expect(inboxWidgetRows(items).map((r) => r.key)).toEqual(['a1', 'a2', 'a3', 'n1']);
    expect(inboxWidgetRows(items, 2)).toHaveLength(2);
  });
  it('is empty for no items or info-only', () => {
    expect(inboxWidgetRows([])).toEqual([]);
    expect(inboxWidgetRows([mk('i', 'info')])).toEqual([]);
  });
});

describe('inboxItemHref', () => {
  it('encodes the key into /inbox?item=', () => {
    expect(inboxItemHref('card_bill:s1:OVERDUE')).toBe('/inbox?item=card_bill%3As1%3AOVERDUE');
  });
});

describe('InboxWidget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the loading skeleton and no counts strip', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<InboxWidget />);
    expect(screen.getByTestId('inbox-widget-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('inbox-widget-counts')).not.toBeInTheDocument();
  });

  it('shows an alert with the message on error, and no counts or footer', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('boom'));
    renderWithQuery(<InboxWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't load the inbox/);
    expect(screen.queryByTestId('inbox-widget-counts')).not.toBeInTheDocument();
    expect(screen.queryByText('View all in Inbox')).not.toBeInTheDocument();
  });

  it('empty: All clear, counts at zero, no footer', async () => {
    seed([]);
    renderWithQuery(<InboxWidget />);
    expect(await screen.findByTestId('inbox-widget-clear')).toHaveTextContent('All clear');
    expect(screen.getByTestId('inbox-widget-counts')).toHaveTextContent('Act now 0');
    expect(screen.getByTestId('inbox-widget-counts')).toHaveTextContent('Needs a look 0');
    expect(screen.queryByText('View all in Inbox')).not.toBeInTheDocument();
  });

  it('info-only inbox is All clear in the widget, with a footer since the info row is not shown', async () => {
    seed([mk('i1', 'info')]);
    renderWithQuery(<InboxWidget />);
    expect(await screen.findByTestId('inbox-widget-clear')).toBeInTheDocument();
    // The info row is not shown, so more items exist than rows: the footer points at the Inbox.
    expect(screen.getByRole('link', { name: /View all in Inbox/ })).toHaveAttribute('href', '/inbox');
  });

  it('counts strip uses the server summary; act-now pill is rose only when something is due', async () => {
    seed([mk('a1', 'act_now'), mk('n1', 'needs_look'), mk('n2', 'needs_look')]);
    const { unmount } = renderWithQuery(<InboxWidget />);
    const strip = await screen.findByTestId('inbox-widget-counts');
    expect(strip).toHaveTextContent('Act now 1');
    expect(strip).toHaveTextContent('Needs a look 2');
    expect(within(strip).getByRole('link', { name: /Act now/ }).className).toMatch(/rose/);
    expect(within(strip).getByRole('link', { name: /Act now/ })).toHaveAttribute('href', '/inbox');
    expect(within(strip).getByRole('link', { name: /Needs a look/ })).toHaveAttribute('href', '/inbox');
    unmount();

    seed([mk('n1', 'needs_look')]);
    renderWithQuery(<InboxWidget />);
    const calm = await screen.findByTestId('inbox-widget-counts');
    expect(within(calm).getByRole('link', { name: /Act now/ }).className).not.toMatch(/rose/);
  });

  it('shows at most 4 rows (act now first) and a View all footer when there are more', async () => {
    seed([
      mk('n1', 'needs_look'), mk('n2', 'needs_look'), mk('a1', 'act_now'),
      mk('a2', 'act_now'), mk('n3', 'needs_look'), mk('a3', 'act_now'),
    ]);
    renderWithQuery(<InboxWidget />);
    const rows = await screen.findAllByTestId('inbox-widget-row');
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => within(r).getByRole('link', { name: /T-/ }).textContent)).toEqual(['T-a1', 'T-a2', 'T-a3', 'T-n1']);
    expect(screen.getByRole('link', { name: /View all in Inbox/ })).toHaveAttribute('href', '/inbox');
  });

  it('no footer when every row fits', async () => {
    seed([mk('a1', 'act_now'), mk('n1', 'needs_look')]);
    renderWithQuery(<InboxWidget />);
    await screen.findAllByTestId('inbox-widget-row');
    expect(screen.queryByText('View all in Inbox')).not.toBeInTheDocument();
  });

  it('exactly 4 items has no footer; 5 does', async () => {
    seed(['1', '2', '3', '4'].map((k) => mk(`a${k}`, 'act_now')));
    const { unmount } = renderWithQuery(<InboxWidget />);
    await screen.findAllByTestId('inbox-widget-row');
    expect(screen.queryByText('View all in Inbox')).not.toBeInTheDocument();
    unmount();
    seed(['1', '2', '3', '4', '5'].map((k) => mk(`a${k}`, 'act_now')));
    renderWithQuery(<InboxWidget />);
    await screen.findAllByTestId('inbox-widget-row');
    expect(screen.getByText('View all in Inbox')).toBeInTheDocument();
  });

  it('row title links to that item on the Inbox page; subtitle goes in the tooltip only', async () => {
    seed([mk('card_bill:s1:OVERDUE', 'act_now', { title: 'HDFC', subtitle: 'due soon' })]);
    renderWithQuery(<InboxWidget />);
    const link = await screen.findByRole('link', { name: 'HDFC' });
    expect(link).toHaveAttribute('href', '/inbox?item=card_bill%3As1%3AOVERDUE');
    expect(link).toHaveAttribute('title', 'HDFC · due soon');
    expect(screen.queryByText('due soon')).not.toBeInTheDocument();
  });

  it('shows the amount, else the positive count badge, else neither', async () => {
    seed([
      mk('a', 'act_now', { title: 'Has amount', amount: 2500, count: 7 }),
      mk('b', 'act_now', { title: 'Has count', count: 7 }),
      mk('c', 'act_now', { title: 'Zero count', count: 0 }),
    ]);
    renderWithQuery(<InboxWidget />);
    const rows = await screen.findAllByTestId('inbox-widget-row');
    expect(rows[0]).toHaveTextContent(/2,500/);
    expect(rows[0]).not.toHaveTextContent(/\b7\b/);
    expect(rows[1]).toHaveTextContent('7');
    expect(rows[2]).not.toHaveTextContent('0');
  });

  it('shows only the first primary action; snooze and dismiss never appear', async () => {
    seed([
      mk('a', 'act_now', {
        title: 'Two',
        actions: [action({ type: 'open', label: 'Open', href: '/x' }), action({ type: 'review', label: 'Second', href: '/y' }), SNOOZE, DISMISS],
      }),
    ]);
    renderWithQuery(<InboxWidget />);
    expect(await screen.findByRole('link', { name: 'Open' })).toHaveAttribute('href', '/x');
    expect(screen.queryByRole('link', { name: 'Second' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Snooze|Dismiss/ })).not.toBeInTheDocument();
  });

  it('a row with no actions shows no action control; a link action falls back to the row href', async () => {
    seed([
      mk('a', 'act_now', { title: 'Bare', actions: [] }),
      mk('b', 'act_now', { title: 'Fallback', href: '/row', actions: [action({ type: 'open', label: 'Go' })] }),
      mk('c', 'act_now', { title: 'NoHref', actions: [action({ type: 'open', label: 'Dead' })] }),
    ]);
    renderWithQuery(<InboxWidget />);
    await screen.findAllByTestId('inbox-widget-row');
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/row');
    expect(screen.queryByRole('link', { name: 'Dead' })).not.toBeInTheDocument();
  });

  it('a bill action opens the bill dialogs; disabled with no statement id anywhere', async () => {
    seed([
      mk('a', 'act_now', { title: 'Pay me', refs: { statementId: 's9' }, actions: [action({ type: 'mark_paid', label: 'Mark paid' })] }),
      mk('b', 'act_now', { title: 'No stmt', actions: [action({ type: 'set_details', label: 'Set details' })] }),
    ]);
    renderWithQuery(<InboxWidget />);
    const pay = await screen.findByRole('button', { name: 'Mark paid' });
    expect(screen.getByRole('button', { name: 'Set details' })).toBeDisabled();
    fireEvent.click(pay);
    expect(JSON.parse(screen.getByTestId('bill-dialogs').getAttribute('data-pending')!)).toMatchObject({
      type: 'mark_paid', statementId: 's9',
    });
  });
});
