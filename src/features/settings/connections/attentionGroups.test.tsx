import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AttentionCard } from './AttentionCard';

pinClock();

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

// The create form is its own feature; here it is a stand-in that reports what it was given.
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  loadAccountForm: () =>
    Promise.resolve((p: { prefillBank?: string; prefillLast4?: string; onCreated?: (a: { id: string }) => void; onClose: () => void }) => (
      <div role="dialog" aria-label="Add account stub">
        <span>{`bank=${p.prefillBank};last4=${p.prefillLast4}`}</span>
        <button
          onClick={() => {
            p.onCreated?.({ id: 'new-acc' });
            p.onClose();
          }}
        >
          Stub create
        </button>
        <button onClick={p.onClose}>Stub cancel</button>
      </div>
    )),
}));

type Row = Schemas['GmailAttentionItemResponse'];
const row = (over: Partial<Row>): Row =>
  ({
    id: 'i1',
    gmailMessageId: 'm1',
    connectionEmail: 'a@gmail.test',
    subject: 'Subject',
    discoveredAt: '2026-10-10T10:05:00Z',
    status: 'UNRESOLVED_ACCOUNT',
    reason: 'NO_ACCOUNT',
    attemptCount: 1,
    extractedLast4: '4242',
    suggestedBankId: 'hdfc',
    suggestedLast4: '4242',
    ...over,
  }) as Row;

function setup(rows: Row[], summary: { reason: Row['reason']; count: number }[], total?: Record<string, number>) {
  vi.mocked(api.GET).mockImplementation((async (url: string, opts?: { params?: { query?: { reason?: string; size?: number } } }) => {
    if (url === '/api/v1/gmail/attention') {
      const q = opts?.params?.query;
      const mine = rows.filter((r) => r.reason === q?.reason).slice(0, q?.size ?? 10);
      return { data: { content: mine, totalElements: total?.[q?.reason ?? ''] ?? mine.length, totalPages: 1, number: 0, size: q?.size ?? 10 } };
    }
    return { data: [{ id: 'acc-1', name: 'HDFC Bank' }] };
  }) as never);
  const props = {
    summary,
    archivedData: null,
    archivedPage: 0,
    onArchivedPageChange: vi.fn(),
    retryItem: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onRetryAll: vi.fn(),
    onArchiveAll: vi.fn(),
  };
  renderWithQuery(<AttentionCard {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('grouped attention list', () => {
  it('shows a group per reason with its count, rows loaded with the reason filter', async () => {
    setup(
      [row({ id: 'a' }), row({ id: 'b', reason: 'NO_AI_KEY', status: 'FAILED_PERMANENT', subject: 'Needs key' })],
      [
        { reason: 'NO_AI_KEY', count: 1 },
        { reason: 'NO_ACCOUNT', count: 1 },
      ],
    );
    const noAccount = await screen.findByTestId('attention-group-NO_ACCOUNT');
    const noKey = screen.getByTestId('attention-group-NO_AI_KEY');
    expect(within(noAccount).getByText('No matching account · 1')).toBeInTheDocument();
    expect(within(noKey).getByText('No AI key · 1')).toBeInTheDocument();
    expect(await within(noKey).findByText('Needs key')).toBeInTheDocument();
    expect(screen.getByText('Needs attention · 2')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/gmail/attention',
      { params: { query: { page: 0, size: 10, includeRetryable: false, reason: 'NO_AI_KEY' } } },
    );
  });

  it('Retry all calls the handler with the group reason', async () => {
    const p = setup([row({})], [{ reason: 'NO_ACCOUNT', count: 1 }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry all' }));
    expect(p.onRetryAll).toHaveBeenCalledWith('NO_ACCOUNT');
  });

  it('Archive all asks first and archives the group only on confirm', async () => {
    const p = setup([row({})], [{ reason: 'NO_ACCOUNT', count: 1 }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive all' }));
    expect(p.onArchiveAll).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive all' }));
    expect(p.onArchiveAll).toHaveBeenCalledWith('NO_ACCOUNT');
  });

  it('Show more loads the next rows of that group', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ id: `r${i}`, subject: `S${i}` }));
    setup(rows, [{ reason: 'NO_ACCOUNT', count: 12 }]);
    await screen.findByText('S0');
    expect(screen.queryByText('S11')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('S11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('hints: AI key and import are links, locked statement is a button', async () => {
    setup(
      [
        row({ id: 'k', reason: 'NO_AI_KEY', status: 'FAILED_PERMANENT', error: 'No active LLM API keys' }),
        row({ id: 'o', reason: 'IMPORT_OFF', status: 'ACCOUNT_NOT_OPTED_IN', accountId: 'acc-9' }),
        row({ id: 'l', reason: 'LOCKED_STATEMENT', status: 'FAILED_PERMANENT', accountId: 'acc-8', error: 'could not be decrypted' }),
      ],
      [
        { reason: 'IMPORT_OFF', count: 1 },
        { reason: 'NO_AI_KEY', count: 1 },
        { reason: 'LOCKED_STATEMENT', count: 1 },
      ],
    );
    expect((await screen.findByRole('link', { name: 'Add an AI key' })).getAttribute('href')).toBe('/settings/ai');
    expect(screen.getByRole('link', { name: 'Set import date' }).getAttribute('href')).toBe('/accounts/acc-9');
    expect(screen.getByRole('button', { name: 'Add the statement password' })).toBeInTheDocument();
  });
});

describe('assign dialog: create account', () => {
  it('creates an account prefilled from the suggestion, then assigns the item to it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 0 } } as never);
    setup([row({})], [{ reason: 'NO_ACCOUNT', count: 1 }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('bank=hdfc;last4=4242')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stub create' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/{ledgerId}/assign',
        expect.objectContaining({ body: { accountId: 'new-acc' } }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Assign account identifier')).toBeNull());
  });

  it('cancelling the create form returns to the picker without assigning', async () => {
    setup([row({})], [{ reason: 'NO_ACCOUNT', count: 1 }]);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stub cancel' }));
    expect(await screen.findByText('Assign account identifier')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
