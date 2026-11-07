import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { UnknownNumberRow } from './AttentionGroupRows';
import { NumberEmailsDialog } from './NumberEmailsDialog';

pinClock();

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

const group = { bank: 'hdfc', last4: '3003', count: 12, firstMail: '2021-05-04T10:00:00Z', lastMail: '2025-04-20T10:00:00Z', kinds: ['ALERT'] } as never;
const email = (id: string, over: Record<string, unknown> = {}, item: Record<string, unknown> = {}) => ({
  item: {
    id,
    gmailMessageId: `g-${id}`,
    connectionEmail: 'me@gmail.test',
    senderAddress: 'alerts@hdfcbank.net',
    subject: `Subject ${id}`,
    internalDate: '2025-04-20T10:00:00Z',
    discoveredAt: '2026-10-10T10:00:00Z',
    status: 'UNRESOLVED_ACCOUNT',
    attemptCount: 0,
    ...item,
  },
  kind: 'ALERT',
  amount: 100.5,
  direction: 'debit',
  ...over,
});
const page = (content: unknown[], over: Record<string, unknown> = {}) => ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 10, ...over });

beforeEach(() => vi.clearAllMocks());

describe('NumberEmailsDialog', () => {
  it('asks for the group page and lists each email with date, subject, sender, kind and amount', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: page([email('a'), email('b', { kind: 'STATEMENT', amount: null, direction: null })]) } as never);
    renderWithQuery(<NumberEmailsDialog group={group} onClose={vi.fn()} />);

    const rows = await screen.findAllByTestId('number-email');
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/gmail/attention/numbers/emails',
      expect.objectContaining({ params: { query: { bank: 'hdfc', last4: '3003', page: 0, size: 10 } } }),
    );
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Subject a')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/alerts@hdfcbank\.net/)).toBeInTheDocument();
    expect(within(rows[0]).getByText('Alert')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/₹100\.50 debit/)).toBeInTheDocument();
    expect(within(rows[1]).getByText('Statement')).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/debit/)).toBeNull();
  });

  it('opens the same details as a per-email row, with the Open in Gmail link', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: page([email('a')]) } as never);
    renderWithQuery(<NumberEmailsDialog group={group} onClose={vi.fn()} />);
    const row = await screen.findByTestId('number-email');
    fireEvent.click(within(row).getByRole('button', { name: 'Details' }));
    const details = within(row).getByTestId('attention-details');
    expect(within(details).getByText('me@gmail.test')).toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'Open in Gmail' })).toHaveAttribute('href', expect.stringContaining('g-a'));
  });

  it('pages server-side', async () => {
    vi.mocked(api.GET).mockImplementation((async (_url: string, opts: { params: { query: { page: number } } }) => ({
      data: opts.params.query.page === 0
        ? page([email('a')], { totalElements: 12, totalPages: 2 })
        : page([email('z')], { totalElements: 12, totalPages: 2, number: 1 }),
    })) as never);
    renderWithQuery(<NumberEmailsDialog group={group} onClose={vi.fn()} />);
    await screen.findByText('Subject a');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Subject z')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith('/api/v1/gmail/attention/numbers/emails', expect.objectContaining({ params: { query: expect.objectContaining({ page: 1 }) } })),
    );
  });

  it('goes back to the last page when the group shrinks under the page it is on', async () => {
    vi.mocked(api.GET).mockImplementation((async (_url: string, opts: { params: { query: { page: number } } }) => ({
      data: opts.params.query.page === 0
        ? page([email('a')], { totalElements: 12, totalPages: 2 })
        : page([], { totalElements: 1, totalPages: 1, number: 1 }), // after a refresh: the rest settled elsewhere
    })) as never);
    renderWithQuery(<NumberEmailsDialog group={group} onClose={vi.fn()} />);
    await screen.findByText('Subject a');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Subject a')).toBeInTheDocument(); // clamped back to page 0, not an empty page 2
    expect(screen.queryByText('No emails are waiting for this number.')).toBeNull();
  });

  it('asks nothing while closed, and says so when the group has no emails left', async () => {
    const { rerender } = renderWithQuery(<NumberEmailsDialog group={null} onClose={vi.fn()} />);
    expect(api.GET).not.toHaveBeenCalled();
    vi.mocked(api.GET).mockResolvedValue({ data: page([]) } as never);
    rerender(<NumberEmailsDialog group={group} onClose={vi.fn()} />);
    expect(await screen.findByText('No emails are waiting for this number.')).toBeInTheDocument();
  });
});

describe('UnknownNumberRow', () => {
  it('has a Details link that opens the group', () => {
    const onDetails = vi.fn();
    renderWithQuery(<UnknownNumberRow group={group} onAdd={vi.fn()} onIgnore={vi.fn()} onDetails={onDetails} />);
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onDetails).toHaveBeenCalledWith(group);
  });
});
