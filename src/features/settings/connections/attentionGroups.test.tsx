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

type Groups = Schemas['AttentionGroupsResponse'];
const number = (over: Record<string, unknown> = {}) => ({
  bank: 'hdfc',
  last4: '3003',
  count: 63,
  firstMail: '2021-05-04T10:00:00Z',
  lastMail: '2025-04-20T10:00:00Z',
  kinds: ['ALERT'],
  suggestion: undefined,
  ...over,
});
const groupsOf = (over: Partial<Groups> = {}): Groups => ({ unknownNumbers: [], importOff: [], ignored: [], total: 0, ...over }) as Groups;
const pageOf = (rows: Row[], over: Record<string, unknown> = {}) =>
  ({ content: rows, totalElements: rows.length, totalPages: 1, number: 0, size: 10, ...over }) as unknown as Schemas['PageGmailAttentionItemResponse'];

/** Ungrouped rows load per reason from the ungrouped list call; the per-reason counts come in as the summary. */
function setup(groups: Groups, rows: Row[] = [], archived: Row[] | null = null, total?: Record<string, number>) {
  vi.mocked(api.GET).mockImplementation((async (url: string, opts?: { params?: { query?: { reason?: string; size?: number } } }) => {
    if (url === '/api/v1/gmail/attention/ungrouped') {
      const q = opts?.params?.query;
      const mine = rows.filter((r) => r.reason === q?.reason).slice(0, q?.size ?? 10);
      return { data: pageOf(mine, { totalElements: total?.[q?.reason ?? ''] ?? mine.length }) };
    }
    return {
      data: [
        { id: 'acc-1', name: 'HDFC Savings' },
        { id: 'acc-2', name: 'ICICI' },
      ],
    };
  }) as never);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.reason as string, (counts.get(r.reason as string) ?? 0) + 1);
  const props = {
    groups,
    ungroupedSummary: [...counts].map(([reason, count]) => ({ reason, count: total?.[reason] ?? count })) as Schemas['AttentionReasonCount'][],
    archivedData: archived ? pageOf(archived) : null,
    archivedPage: 0,
    onArchivedPageChange: vi.fn(),
    retryItem: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onRetryAll: vi.fn(),
    onArchiveAll: vi.fn(),
    onIgnoreNumber: vi.fn(),
    onUnignoreNumber: vi.fn(),
  };
  renderWithQuery(<AttentionCard {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('unknown numbers', () => {
  it('shows a row per number with its mail span, the statements note and the matching account', () => {
    setup(
      groupsOf({
        unknownNumbers: [
          number({ suggestion: { accountId: 'acc-1', accountName: 'HDFC Savings', matched: 3, total: 4, example: { date: '2025-01-01', amount: 10, description: 'x' } } }),
          number({ bank: null, last4: '7777', count: 1, kinds: ['ALERT', 'STATEMENT'], lastMail: '2021-05-20T10:00:00Z' }),
        ],
      }),
    );
    const rows = screen.getAllByTestId('attention-number');
    expect(within(rows[0]).getByText('HDFC Bank ••3003')).toBeInTheDocument();
    expect(within(rows[0]).getByText('63 emails · May 2021 – Apr 2025')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Matches HDFC Savings (3 of 4)')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Unknown bank ••7777')).toBeInTheDocument();
    expect(within(rows[1]).getByText('1 email · May 2021 · statements')).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/^Matches/)).toBeNull();
    expect(screen.getByText('Needs attention · 2')).toBeInTheDocument();
  });

  it('counts groups plus ungrouped emails in the header', () => {
    setup(groupsOf({ unknownNumbers: [number()], importOff: [{ accountId: 'a9', accountName: 'Kotak', count: 5, firstMail: '2025-01-01T00:00:00Z', lastMail: '2025-02-01T00:00:00Z' }] }), [row({ extractedLast4: null })]);
    expect(screen.getByText('Needs attention · 3')).toBeInTheDocument();
  });

  it('Add to account preselects the suggestion, assigns the number and reports the outcome', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { identifierId: 'x', reactivatedCount: 63, skippedCount: 0, remainingCount: 0, jobIds: [] } } as never);
    setup(groupsOf({ unknownNumbers: [number({ suggestion: { accountId: 'acc-1', accountName: 'HDFC Savings', matched: 3, total: 3, example: { date: '2025-01-01', amount: 10, description: 'x' } } })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to account' }));
    expect(await screen.findByText('Add number to account')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Add to account' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/numbers/assign',
        expect.objectContaining({ body: { bank: 'hdfc', last4: '3003', accountId: 'acc-1' } }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Add number to account')).toBeNull());
  });

  it('with no suggestion nothing is preselected, so Add to account stays disabled', async () => {
    setup(groupsOf({ unknownNumbers: [number()] }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to account' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Add to account' })).toBeDisabled();
  });

  it('shows the inline error when adding fails and keeps the dialog open', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    setup(groupsOf({ unknownNumbers: [number({ suggestion: { accountId: 'acc-1', accountName: 'HDFC Savings', matched: 1, total: 1, example: { date: '2025-01-01', amount: 10, description: 'x' } } })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to account' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    expect(await screen.findByText(/boom|Couldn't add the number to the account/)).toBeInTheDocument();
    expect(screen.getByText('Add number to account')).toBeInTheDocument();
  });

  it('Ignore this number is in the row menu and reports the group', async () => {
    const p = setup(groupsOf({ unknownNumbers: [number()] }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More options' }), { button: 0 });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Ignore this number' }));
    expect(p.onIgnoreNumber).toHaveBeenCalledWith(expect.objectContaining({ bank: 'hdfc', last4: '3003' }));
  });

  it('creates an account prefilled from the number, then adds the number to it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 2, skippedCount: 0 } } as never);
    setup(groupsOf({ unknownNumbers: [number()] }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('bank=hdfc;last4=3003')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stub create' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/numbers/assign',
        expect.objectContaining({ body: { bank: 'hdfc', last4: '3003', accountId: 'new-acc' } }),
      ),
    );
  });
});

describe('import off', () => {
  it('shows one row per account with the waiting count and the Set import date step', () => {
    setup(groupsOf({ importOff: [{ accountId: 'acc-9', accountName: 'Kotak Savings', count: 12, firstMail: '2025-01-01T00:00:00Z', lastMail: '2025-03-01T00:00:00Z' }] }));
    const r = screen.getByTestId('attention-import-off');
    expect(within(r).getByText('Gmail import is off for Kotak Savings')).toBeInTheDocument();
    expect(within(r).getByText(/^12 emails waiting/)).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: 'Set import date' })).toBeInTheDocument();
  });
});

describe('ignored numbers', () => {
  const ignored = { id: 'ig1', bank: 'hdfc', last4: '3003', count: 63, createdAt: '2026-11-01T00:00:00Z' };

  it('lists them in the Archived view with Stop ignoring', () => {
    const p = setup(groupsOf({ ignored: [ignored] }));
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 1' }));
    expect(screen.getByText('Ignored numbers · 1')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank ••3003')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop ignoring' }));
    expect(p.onUnignoreNumber).toHaveBeenCalledWith(ignored);
  });
});

describe('per-email list', () => {
  it('shows a section per reason with its count, rows loaded from the ungrouped list with the reason filter', async () => {
    setup(
      groupsOf({ unknownNumbers: [number()] }),
      [row({ id: 'a' }), row({ id: 'b', reason: 'NO_AI_KEY', status: 'FAILED_PERMANENT', subject: 'Needs key' })],
    );
    const noAccount = await screen.findByTestId('attention-group-NO_ACCOUNT');
    const noKey = screen.getByTestId('attention-group-NO_AI_KEY');
    expect(within(noAccount).getByText('No matching account · 1')).toBeInTheDocument();
    expect(within(noKey).getByText('No AI key · 1')).toBeInTheDocument();
    expect(await within(noKey).findByText('Needs key')).toBeInTheDocument();
    expect(screen.getByText('Unknown numbers · 1')).toBeInTheDocument();
    expect(screen.getByText('Needs attention · 3')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/gmail/attention/ungrouped',
      { params: { query: { page: 0, size: 10, includeRetryable: false, reason: 'NO_AI_KEY' } } },
    );
  });

  it('shows the ungrouped emails with their own Assign', async () => {
    setup(groupsOf({ unknownNumbers: [number()] }), [row({ id: 'e1', subject: 'Odd mail' })]);
    expect(await screen.findByText('Odd mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument();
  });

  it('Retry all calls the handler with the section reason', async () => {
    const p = setup(groupsOf(), [row({})]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry all' }));
    expect(p.onRetryAll).toHaveBeenCalledWith('NO_ACCOUNT');
  });

  it('Archive all asks first and archives the section only on confirm', async () => {
    const p = setup(groupsOf(), [row({})]);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive all' }));
    expect(p.onArchiveAll).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive all' }));
    expect(p.onArchiveAll).toHaveBeenCalledWith('NO_ACCOUNT');
  });

  it('Show more loads the next rows of that section', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ id: `r${i}`, subject: `S${i}` }));
    setup(groupsOf(), rows);
    await screen.findByText('S0');
    expect(screen.queryByText('S11')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('S11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('hints: AI key is a link, locked statement is a button', async () => {
    setup(groupsOf(), [
      row({ id: 'k', reason: 'NO_AI_KEY', status: 'FAILED_PERMANENT', error: 'No active LLM API keys' }),
      row({ id: 'l', reason: 'LOCKED_STATEMENT', status: 'FAILED_PERMANENT', accountId: 'acc-8', error: 'could not be decrypted' }),
    ]);
    expect((await screen.findByRole('link', { name: 'Add an AI key' })).getAttribute('href')).toBe('/settings/ai');
    expect(await screen.findByRole('button', { name: 'Add the statement password' })).toBeInTheDocument();
  });
});

describe('assign dialog: create account', () => {
  it('creates an account prefilled from the suggestion, then assigns the item to it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 0 } } as never);
    setup(groupsOf(), [row({})]);
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
  });

  it('cancelling the create form returns to the picker without assigning', async () => {
    setup(groupsOf(), [row({})]);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stub cancel' }));
    expect(await screen.findByText('Assign account identifier')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
