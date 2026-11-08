import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./InboxBillHost', () => ({ InboxBillHost: () => null }));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxScreen } from './InboxScreen';
import { action, inbox, item } from './inboxTestUtils';

const newAccount = item({
  key: 'nps_new_account:p1',
  kind: 'nps_new_account',
  section: 'needs_look',
  title: 'New NPS account found in Gmail',
  href: '/investments/nps',
  refs: { npsPendingId: 'p1' },
  actions: [
    action({ type: 'nps_add_self', label: 'Add as mine' }),
    action({ type: 'nps_add_child', label: "Add as my child's" }),
    action({ type: 'nps_ignore', label: 'Ignore' }),
  ],
});
const password = item({
  key: 'nps_password:p2',
  kind: 'nps_password',
  section: 'needs_look',
  title: 'NPS statement needs its password',
  href: '/investments/nps',
  refs: { npsPendingId: 'p2' },
  actions: [action({ type: 'nps_password', label: 'Enter password' }), action({ type: 'dismiss', label: 'Dismiss' })],
});

describe('InboxScreen, NPS Gmail rows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([newAccount, password]) } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: { accountId: 'a1', importing: 3 } } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('Add as my child\'s posts the relation for the pending id', async () => {
    renderWithQuery(<InboxScreen />);
    fireEvent.click(await screen.findByRole('button', { name: "My child's" }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/{key}/account', { params: { path: { key: 'p1' } }, body: { relation: 'CHILD' } }),
    );
  });

  it('Ignore deletes the pending email', async () => {
    renderWithQuery(<InboxScreen />);
    // The new-account row keeps Ignore in its menu.
    await userEvent.click((await screen.findAllByRole('button', { name: 'More options' }))[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Ignore' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/{key}', { params: { path: { key: 'p1' } } }));
  });

  it('Enter password is a link to the NPS tab', async () => {
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByRole('link', { name: 'Enter password' })).toHaveAttribute('href', '/investments/nps');
  });
});

const match = item({
  key: 'nps_match:e1:t1',
  kind: 'nps_match',
  section: 'needs_look',
  title: 'NPS contribution ₹5,000 — is this the payment?',
  refs: { npsEntryId: 'e1', transactionId: 't1' },
  actions: [action({ type: 'nps_link', label: 'Link' }), action({ type: 'nps_dismiss', label: 'Not this one' })],
});
const record = item({
  key: 'nps_record:t2',
  kind: 'nps_record',
  section: 'needs_look',
  title: 'Record as NPS contribution?',
  refs: { transactionId: 't2' },
  actions: [action({ type: 'nps_record', label: 'Record' }), action({ type: 'nps_not_nps', label: 'Not NPS' })],
});
const summary = (accounts: unknown[]) => ({ data: { accounts } });
const acct = (tier2Active: boolean) => ({ id: 'a1', relation: 'SELF', status: 'ACTIVE', tier2Active });

describe('InboxScreen, nps_setup row', () => {
  it('Not NPS in the menu posts the setup not-nps action', async () => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({
      data: inbox([
        item({
          key: 'nps_setup',
          kind: 'nps_setup',
          section: 'needs_look',
          title: 'Looks like you invest in NPS',
          href: '/investments/nps',
          actions: [
            action({ type: 'open', label: 'Open', href: '/investments/nps' }),
            action({ type: 'nps_setup_not_nps', label: 'Not NPS' }),
            action({ type: 'dismiss', label: 'Dismiss' }),
          ],
        }),
      ]),
    } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByRole('link', { name: 'Set up' })).toHaveAttribute('href', '/investments/nps');
    await userEvent.click(await screen.findByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Not NPS' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/setup/not-nps'));
  });
});

describe('InboxScreen, NPS payment rows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
  });
  const load = (items: ReturnType<typeof item>[], accounts: unknown[] = [acct(false)]) =>
    vi.mocked(api.GET).mockImplementation((async (path: string) =>
      path === '/api/v1/nps/summary' ? summary(accounts) : { data: inbox(items) }) as never);

  it('Link posts the transaction to the contribution', async () => {
    load([match]);
    renderWithQuery(<InboxScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/entries/{id}/transaction', { params: { path: { id: 'e1' } }, body: { transactionId: 't1' } }),
    );
  });

  it('Not this one dismisses the pairing', async () => {
    load([match]);
    renderWithQuery(<InboxScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Not this one' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/entries/{id}/suggestion/dismiss', { params: { path: { id: 'e1' } }, body: { transactionId: 't1' } }),
    );
  });

  it('without Tier II, Record is one button and sends the account but no tier', async () => {
    load([record]);
    renderWithQuery(<InboxScreen />);
    expect(screen.queryByRole('button', { name: 'Tier II' })).toBeNull();
    const recordButton = await screen.findByRole('button', { name: 'Record' });
    await waitFor(() => expect(recordButton).toBeEnabled());
    fireEvent.click(recordButton);
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/transactions/{txnId}/record', {
        params: { path: { txnId: 't2' } },
        body: { accountId: 'a1', tier: undefined },
      }),
    );
  });

  it('with Tier II, the tier buttons record that tier and Not NPS moves to the menu', async () => {
    load([record], [acct(true)]);
    renderWithQuery(<InboxScreen />);
    const tierTwo = await screen.findByRole('button', { name: 'Tier II' });
    await waitFor(() => expect(tierTwo).toBeEnabled());
    fireEvent.click(tierTwo);
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/transactions/{txnId}/record', {
        params: { path: { txnId: 't2' } },
        body: { accountId: 'a1', tier: 'II' },
      }),
    );
  });

  it('Not NPS in the menu marks the payment', async () => {
    load([record], [acct(true)]);
    renderWithQuery(<InboxScreen />);
    await screen.findByRole('button', { name: 'Tier I' });
    await userEvent.click(screen.getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Not NPS' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/transactions/{txnId}/not-nps', { params: { path: { txnId: 't2' } } }));
  });
});
