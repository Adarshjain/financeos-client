import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AssignDialog } from './AssignDialog';
import { AssignNumberDialog } from './AssignNumberDialog';

pinClock(); // 29 Oct 2026

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({ loadAccountForm: () => Promise.resolve(() => null) }));

const seen = { firstSeen: '2021-05-04', lastSeen: '2025-04-20', mailCount: 63, transactionCount: 0 };
const holder = (id: string, role: 'PRIMARY' | 'ADDON', cards: object[], personName?: string) => ({ id, accountId: 'acc-1', role, personName, cards });
const active = { id: 'c1', last4: '1111', issuedOn: '2025-05-01', cardholderId: 'h1' };

let holders: object[];
let accounts: object[];

function mockApi() {
  vi.mocked(api.GET).mockImplementation((async (url: string) => {
    if (url === '/api/v1/accounts') return { data: accounts };
    if (url === '/api/v1/accounts/{accountId}/cardholders') return { data: holders };
    if (url === '/api/v1/accounts/{accountId}/cards/seen-dates') return { data: seen };
    return { data: [] };
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  accounts = [{ id: 'acc-1', name: 'HDFC Savings', type: 'bank_account' }];
  holders = [holder('h1', 'PRIMARY', [active])];
  mockApi();
});

const group = (over: Record<string, unknown> = {}) =>
  ({ bank: 'hdfc', last4: '3003', count: 63, firstMail: '2021-05-04T10:00:00Z', lastMail: '2025-04-20T10:00:00Z', kinds: ['ALERT'], suggestion: { accountId: 'acc-1', accountName: 'HDFC Savings', matched: 3, total: 3, example: { date: '2025-01-01', amount: 10, description: 'x' } }, ...over }) as never;

describe('AssignNumberDialog: another number or an old card', () => {
  it('preselects An old card when the account has another active card and the number was last seen before it was issued, with the seen dates', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 63, skippedCount: 0, remainingCount: 0, jobIds: [], cardId: 'new' } } as never);
    renderWithQuery(<AssignNumberDialog group={group()} onClose={vi.fn()} />);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByLabelText('Opened on')).toHaveValue('04/05/2021'));
    expect(within(dialog).getByRole('radio', { name: 'An old card' })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByLabelText('Closed on')).toHaveValue('20/04/2025');
    expect(within(dialog).queryByText('Cardholder')).toBeNull(); // one holder: no picker

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/numbers/assign',
        expect.objectContaining({
          body: { bank: 'hdfc', last4: '3003', accountId: 'acc-1', pastCard: { issuedOn: '2021-05-04', closedOn: '2025-04-20' } },
        }),
      ),
    );
  });

  it('defaults to Another number when the account has no other active card, and sends no past card', async () => {
    holders = [holder('h1', 'PRIMARY', [])];
    vi.mocked(api.POST).mockResolvedValue({ data: { identifierId: 'i', reactivatedCount: 0, skippedCount: 0, remainingCount: 0, jobIds: [] } } as never);
    renderWithQuery(<AssignNumberDialog group={group()} onClose={vi.fn()} />);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'Another number' })).toHaveAttribute('aria-checked', 'true'));
    expect(within(dialog).queryByLabelText('Opened on')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/gmail/attention/numbers/assign', expect.objectContaining({ body: { bank: 'hdfc', last4: '3003', accountId: 'acc-1' } })),
    );
  });

  it('sends no past card after switching back to Another number', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { identifierId: 'i', reactivatedCount: 0, skippedCount: 0, remainingCount: 0, jobIds: [] } } as never);
    renderWithQuery(<AssignNumberDialog group={group()} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'An old card' })).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Another number' }));
    expect(within(dialog).queryByLabelText('Opened on')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/gmail/attention/numbers/assign', expect.objectContaining({ body: { bank: 'hdfc', last4: '3003', accountId: 'acc-1' } })),
    );
    expect(vi.mocked(api.POST).mock.calls[0][1]).not.toHaveProperty('body.pastCard', expect.anything());
  });

  it('keeps a date the user typed when the seen dates arrive late', async () => {
    let release: (v: unknown) => void = () => {};
    const late = new Promise((resolve) => {
      release = resolve;
    });
    vi.mocked(api.GET).mockImplementation((async (url: string) => {
      if (url === '/api/v1/accounts') return { data: accounts };
      if (url === '/api/v1/accounts/{accountId}/cardholders') return { data: holders };
      if (url === '/api/v1/accounts/{accountId}/cards/seen-dates') return late;
      return { data: [] };
    }) as never);
    renderWithQuery(<AssignNumberDialog group={group({ firstMail: '2021-05-04T10:00:00Z' })} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    const opened = await within(dialog).findByLabelText('Opened on');
    fireEvent.change(opened, { target: { value: '01/02/2020' } });
    await waitFor(() => expect(opened).toHaveValue('01/02/2020'));
    release({ data: seen });
    await waitFor(() => expect(within(dialog).getByText(/^Seen in 63 emails/)).toBeInTheDocument());
    expect(within(dialog).getByLabelText('Opened on')).toHaveValue('01/02/2020'); // typed, so not replaced by 04/05/2021
    expect(within(dialog).getByLabelText('Closed on')).toHaveValue('20/04/2025'); // untouched, so it takes the seen date
  });

  it('defaults to Another number for a number seen recently, and lets the user switch to An old card', async () => {
    renderWithQuery(<AssignNumberDialog group={group({ lastMail: '2026-10-20T10:00:00Z' })} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'Another number' })).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'An old card' }));
    expect(await within(dialog).findByLabelText('Opened on')).toBeInTheDocument();
  });

  it('shows the holder picker only when the account has several holders', async () => {
    holders = [holder('h1', 'PRIMARY', [active]), holder('h2', 'ADDON', [], 'Asha')];
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 0, skippedCount: 0, remainingCount: 0, jobIds: [], cardId: 'n' } } as never);
    renderWithQuery(<AssignNumberDialog group={group()} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Cardholder')).toBeInTheDocument();
  });

  it('blocks submit with a message when a date is missing', async () => {
    vi.mocked(api.GET).mockImplementation((async (url: string) => {
      if (url === '/api/v1/accounts') return { data: accounts };
      if (url === '/api/v1/accounts/{accountId}/cardholders') return { data: holders };
      return { data: { mailCount: 0, transactionCount: 0 } };
    }) as never);
    renderWithQuery(<AssignNumberDialog group={group({ firstMail: undefined, lastMail: '2021-05-20T10:00:00Z' })} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'An old card' })).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to account' }));
    expect(await within(dialog).findByText('Enter when the card was opened.')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('offers no choice for an account that has no cards (a broker)', async () => {
    accounts = [{ id: 'acc-1', name: 'Zerodha', type: 'broker' }];
    renderWithQuery(<AssignNumberDialog group={group()} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Add to account' })).toBeEnabled());
    expect(within(dialog).queryByRole('radio', { name: 'An old card' })).toBeNull();
  });
});

describe('AssignDialog (one email): another number or an old card', () => {
  const item = { id: 'i1', gmailMessageId: 'm1', extractedLast4: '3003', internalDate: '2025-04-20T10:00:00Z', discoveredAt: '2026-10-10T10:00:00Z', status: 'UNRESOLVED_ACCOUNT' } as Schemas['GmailAttentionItemResponse'];

  it('saves the email number as an old card with the chosen dates', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 2, jobIds: [], cardId: 'n' } } as never);
    renderWithQuery(<AssignDialog item={item} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('radio', { name: 'An old card' })).toHaveAttribute('aria-checked', 'true'));
    await waitFor(() => expect(within(dialog).getByLabelText('Closed on')).toHaveValue('20/04/2025'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign & remember' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/{ledgerId}/assign',
        expect.objectContaining({ body: { accountId: 'acc-1', pastCard: { issuedOn: '2021-05-04', closedOn: '2025-04-20' } } }),
      ),
    );
  });

  it('shows no choice for an email without a 4-digit number', async () => {
    renderWithQuery(<AssignDialog item={{ ...item, extractedLast4: null }} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Assign & remember' })).toBeEnabled());
    expect(within(dialog).queryByRole('radio', { name: 'An old card' })).toBeNull();
  });
});
