import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { action, inbox, item } from '@/features/inbox/inboxTestUtils';
import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bodyProps } from '../testFixtures';
import { AttentionBody } from './AttentionBody';
import { INBOX_WIDGET_ROW_LIMIT, inboxItemHref, inboxWidgetRows } from './attentionRows';

const MARK_PAID = action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } });
const REVIEW = action({ type: 'review', label: 'Review', href: '/transactions?status=review' });

const bill = item({ key: 'bill:s1', kind: 'bill', title: 'Amex bill', subtitle: '₹33,900 · 15 Oct', refs: { statementId: 's1' }, actions: [MARK_PAID] });
const review = item({ key: 'review', kind: 'review', section: 'needs_look', title: 'Transactions to review', actions: [REVIEW] });

const render = () => renderWithQuery(<AttentionBody {...bodyProps('attention')} />);

describe('inboxWidgetRows', () => {
  it('act-now rows first, then needs-a-look, never info, up to the limit', () => {
    const rows = inboxWidgetRows([
      item({ key: 'n1', section: 'needs_look' }),
      item({ key: 'i1', section: 'info' }),
      item({ key: 'a1' }),
      item({ key: 'a2' }),
      item({ key: 'a3' }),
      item({ key: 'a4' }),
    ]);
    expect(INBOX_WIDGET_ROW_LIMIT).toBe(4);
    expect(rows.map((r) => r.key)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(inboxWidgetRows([item({ key: 'i', section: 'info' })])).toEqual([]);
  });

  it('a row\'s own place on the Inbox page', () => {
    expect(inboxItemHref('card_bill:s1:OVERDUE')).toBe('/inbox?item=card_bill%3As1%3AOVERDUE');
  });
});

describe('AttentionBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the loading rows while the inbox loads', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    render();
    expect(screen.getByTestId('inbox-widget-loading')).toBeInTheDocument();
  });

  it('each row is one link to its item in the Inbox, with its title and context and no buttons', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([bill, review]) } as never);
    render();
    const rows = await screen.findAllByTestId('inbox-widget-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Amex bill');
    expect(rows[0]).toHaveTextContent('₹33,900 · 15 Oct');
    expect(rows[0]).toHaveAttribute('href', expect.stringContaining('/inbox?item=bill%3As1'));
    expect(rows[1]).toHaveAttribute('href', expect.stringContaining('/inbox?item=review'));
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark paid')).not.toBeInTheDocument();
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
  });

  it('shows at most the row limit and no link of its own: the header link opens the Inbox', async () => {
    const many = Array.from({ length: 6 }, (_, i) => item({ key: `a${i}`, title: `Row ${i}` }));
    vi.mocked(api.GET).mockResolvedValue({ data: inbox(many) } as never);
    render();
    expect(await screen.findAllByTestId('inbox-widget-row')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: 'View all in Inbox' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbox-widget-counts')).not.toBeInTheDocument();
  });

  it('info rows stay on the Inbox page: nothing else to do reads "All clear"', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([item({ key: 'i', section: 'info' })]) } as never);
    render();
    expect(await screen.findByText('All clear')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs you right now')).toBeInTheDocument();
  });

  it('a failure names it and offers Retry', async () => {
    vi.mocked(api.GET).mockRejectedValue(new ApiError(500, { code: 'X', message: 'Inbox is down' }));
    render();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this widget");
    expect(alert).toHaveTextContent('Inbox is down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
