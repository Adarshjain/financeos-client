import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AttentionCard } from './AttentionCard';

pinClock();

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

type Paged = Schemas['PageGmailAttentionItemResponse'];

const item = (over: Record<string, unknown>) => ({
  id: 'i1',
  gmailMessageId: 'm1',
  connectionEmail: 'arjun.mehta@gmail.test',
  senderAddress: 'alerts@uber.com',
  subject: 'Your Uber receipt',
  internalDate: '2026-10-10T10:00:00Z',
  discoveredAt: '2026-10-10T10:05:00Z',
  processedAt: '2026-10-11T09:00:00Z',
  status: 'UNRESOLVED_ACCOUNT',
  extractedLast4: '9999',
  attemptCount: 2,
  error: 'UNRESOLVED_ACCOUNT',
  ...over,
});

const page = (content: unknown[], over: Record<string, unknown> = {}): Paged =>
  ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 10, ...over }) as unknown as Paged;

const ACCOUNTS = [{ id: 'acc-1', name: 'HDFC Bank' }, { id: 'acc-2', name: 'ICICI' }];

/** Active rows (all in one reason, NO_ACCOUNT unless the row says otherwise) come from the per-reason list call. */
function setup(over: Partial<React.ComponentProps<typeof AttentionCard>> & { rows?: unknown[]; total?: number } = {}) {
  const { rows = [item({})], total, ...rest } = over;
  const reasonOf = (r: unknown) => (r as { reason?: string }).reason ?? 'NO_ACCOUNT';
  vi.mocked(api.GET).mockImplementation((async (url: string, opts?: { params?: { query?: { reason?: string; size?: number } } }) => {
    if (url === '/api/v1/gmail/attention') {
      const q = opts?.params?.query;
      const mine = rows.filter((r) => reasonOf(r) === q?.reason).slice(0, q?.size ?? 10);
      return { data: page(mine, { totalElements: total ?? mine.length }) };
    }
    return { data: ACCOUNTS };
  }) as never);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(reasonOf(r), (counts.get(reasonOf(r)) ?? 0) + 1);
  const props = {
    summary: [...counts].map(([reason, count]) => ({ reason, count: total ?? count })),
    archivedData: null,
    archivedPage: 0,
    onArchivedPageChange: vi.fn(),
    retryItem: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onRetryAll: vi.fn(),
    onArchiveAll: vi.fn(),
    ...rest,
  } as React.ComponentProps<typeof AttentionCard>;
  renderWithQuery(<AttentionCard {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AttentionCard', () => {
  it('shows the count, the label, date and sender, the subject and the plain-words summary', async () => {
    setup();
    expect(await screen.findByText('Your Uber receipt')).toBeInTheDocument();
    expect(screen.getByText('Needs attention · 1')).toBeInTheDocument();
    expect(screen.getByText('Emails that could not become transactions')).toBeInTheDocument();
    expect(screen.getByText('No matching account')).toBeInTheDocument();
    expect(screen.getByText('10 Oct · alerts@uber.com')).toBeInTheDocument();
    expect(screen.getByText('Your Uber receipt')).toBeInTheDocument();
    expect(screen.getByText(/none of your accounts \(or more than one\) match it/)).toBeInTheDocument();
  });

  it('falls back to (no subject)', async () => {
    setup({ rows: [item({ subject: null })] });
    expect(await screen.findByText('(no subject)')).toBeInTheDocument();
  });

  it('shows Assign only for an unresolved account with a last4', async () => {
    setup({
      rows: [
        item({ id: 'a' }),
        item({ id: 'b', status: 'UNRESOLVED_ACCOUNT', extractedLast4: null }),
        item({ id: 'c', status: 'FAILED_PERMANENT' }),
      ],
    });
    await screen.findAllByTestId('attention-item');
    expect(screen.getAllByRole('button', { name: 'Assign' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(3);
  });

  it('retries and archives an item', async () => {
    const p = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(p.retryItem).toHaveBeenCalledWith('i1');
    expect(p.onArchive).toHaveBeenCalledWith('i1');
  });

  it('opens and hides the details list with every field', async () => {
    setup({ rows: [item({ accountName: 'HDFC Regalia' })] });
    expect(screen.queryByTestId('attention-details')).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Details' }));
    const d = screen.getByTestId('attention-details');
    for (const text of ['Mailbox', 'arjun.mehta@gmail.test', 'From', 'Email date', 'Card', '••9999', 'Account', 'HDFC Regalia', 'First seen', 'Last tried', 'Attempts', 'Error']) {
      expect(d).toHaveTextContent(text);
    }
    expect(d).toHaveTextContent('10 Oct');
    const link = screen.getByRole('link', { name: 'Open in Gmail' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toContain('authuser=arjun.mehta%40gmail.test');
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByTestId('attention-details')).toBeNull();
  });

  it('assigns an account and remembers it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 0 } } as never);
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    expect(await screen.findByText('Assign account identifier')).toBeInTheDocument();
    expect(screen.getByText('••9999')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assign & remember' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assign & remember' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/{ledgerId}/assign',
        expect.objectContaining({ body: { accountId: 'acc-1' } }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Assign account identifier')).toBeNull());
  });

  it('shows the inline error when assigning fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assign & remember' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assign & remember' }));
    expect(await screen.findByText(/boom|Couldn't assign the identifier. Try again./)).toBeInTheDocument();
    expect(screen.getByText('Assign account identifier')).toBeInTheDocument();
  });

  it('switches to the archived list and back, with Unarchive', async () => {
    const p = setup({ archivedData: page([item({ id: 'z', archivedAt: '2026-10-03T10:00:00Z', subject: 'Old SBI alert' })], { totalElements: 3 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 3' }));
    expect(screen.getByText('Archived · 3')).toBeInTheDocument();
    expect(screen.getByText('Kept out of Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Old SBI alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
    expect(p.onUnarchive).toHaveBeenCalledWith('z');
    fireEvent.click(screen.getByRole('button', { name: 'Back to needs attention' }));
    expect(screen.getByText('Needs attention · 1')).toBeInTheDocument();
    await screen.findByTestId('attention-item');
  });

  it('does not jump into the Archived view when something is archived after it was emptied', () => {
    const arch = (n: number) => page([item({ id: 'z', archivedAt: '2026-10-03T10:00:00Z', subject: 'Old SBI alert' })], { totalElements: n });
    const props = {
      summary: [{ reason: 'NO_ACCOUNT' as const, count: 1 }],
      onRetryAll: vi.fn(),
      onArchiveAll: vi.fn(),
      archivedPage: 0,
      onArchivedPageChange: vi.fn(),
      retryItem: vi.fn(),
      onArchive: vi.fn(),
      onUnarchive: vi.fn(),
    };
    const { rerender } = renderWithQuery(<AttentionCard {...props} archivedData={arch(1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 1' }));
    expect(screen.getByText('Old SBI alert')).toBeInTheDocument();
    rerender(<AttentionCard {...props} archivedData={null} />);
    rerender(<AttentionCard {...props} archivedData={arch(1)} />);
    expect(screen.queryByText('Old SBI alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Archived · 1' })).toBeInTheDocument();
  });

  it('shows no Archived link when nothing is archived', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^Archived/ })).toBeNull();
  });

  it('gives the archived list its own pager', () => {
    const p = setup({ archivedData: page([item({ archivedAt: '2026-10-03T10:00:00Z' })], { totalElements: 12, totalPages: 2 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 12' }));
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(p.onArchivedPageChange).toHaveBeenCalledWith(1);
      });

  it('scrolls into view for the deep link', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    setup({ autoScroll: true });
    expect(scroll).toHaveBeenCalled();
  });

  it('says nothing needs attention when the list is empty', () => {
    setup({ rows: [] });
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
  });
});
