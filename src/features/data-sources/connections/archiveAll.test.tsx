import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ArchiveAllDialog } from './ArchiveAllDialog';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

const mail = (i: number, over: Record<string, unknown> = {}) => ({
  id: `m${i}`,
  gmailMessageId: `g${i}`,
  connectionEmail: 'a@gmail.test',
  senderAddress: `sender${i}@bank.test`,
  subject: `A rather long subject number ${i} that must never be cut short`,
  internalDate: '2026-10-10T10:00:00Z',
  discoveredAt: '2026-10-11T10:00:00Z',
  status: 'UNRESOLVED_ACCOUNT',
  reason: 'NO_ACCOUNT',
  attemptCount: 0,
  ...over,
});

function paged(content: unknown[], total: number) {
  return { content, totalElements: total, totalPages: 1, size: 10, number: 0 };
}

function setup(ungroupedOnly: boolean, total = 12) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  vi.mocked(api.GET).mockImplementation((async (_path: string, init: { params: { query: { size: number } } }) => ({
    data: paged(Array.from({ length: Math.min(init.params.query.size, total) }, (_, i) => mail(i)), total),
  })) as never);
  renderWithQuery(
    <ArchiveAllDialog reason="NO_ACCOUNT" ungroupedOnly={ungroupedOnly} count={total} confirming={false} onConfirm={onConfirm} onClose={onClose} />,
  );
  return { onConfirm, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('ArchiveAllDialog', () => {
  it('titles with the count and lists subject, sender and date of the mails from the ungrouped endpoint', async () => {
    setup(true);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Archive 12 emails?')).toBeInTheDocument();
    expect(await within(dialog).findByText('A rather long subject number 0 that must never be cut short')).toBeInTheDocument();
    expect(within(dialog).getByText(/sender0@bank\.test · /)).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/gmail/attention/ungrouped', {
      params: { query: { page: 0, size: 10, includeRetryable: false, reason: 'NO_ACCOUNT' } },
    });
  });

  it('uses the all-attention endpoint when not limited to ungrouped mails', async () => {
    setup(false);
    await screen.findByText('A rather long subject number 0 that must never be cut short');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/gmail/attention', {
      params: { query: { page: 0, size: 10, includeRetryable: false, reason: 'NO_ACCOUNT' } },
    });
  });

  it('Show more loads the next mails', async () => {
    setup(true);
    await screen.findByText('A rather long subject number 9 that must never be cut short');
    expect(screen.queryByText('A rather long subject number 10 that must never be cut short')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('A rather long subject number 11 that must never be cut short')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull());
  });

  it('Archive all still calls the confirm handler once', async () => {
    const { onConfirm } = setup(true);
    await screen.findByText('A rather long subject number 0 that must never be cut short');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archive all' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('starts from one page again after the reason is cleared without onClose', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, init: { params: { query: { size: number } } }) => ({
      data: paged(Array.from({ length: Math.min(init.params.query.size, 12) }, (_, i) => mail(i)), 12),
    })) as never);
    const props = { ungroupedOnly: true, count: 12, confirming: false, onConfirm: vi.fn(), onClose: vi.fn() };
    const { rerender } = renderWithQuery(<ArchiveAllDialog reason="NO_ACCOUNT" {...props} />);
    await screen.findByText('A rather long subject number 9 that must never be cut short');
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    await screen.findByText('A rather long subject number 11 that must never be cut short');
    rerender(<ArchiveAllDialog reason={null} {...props} />);
    rerender(<ArchiveAllDialog reason="NO_ACCOUNT" {...props} />);
    await waitFor(() => expect(screen.queryByText('A rather long subject number 11 that must never be cut short')).toBeNull());
    expect(screen.getByText('A rather long subject number 9 that must never be cut short')).toBeInTheDocument();
  });
});
