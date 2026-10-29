import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./InboxBillHost', () => ({ InboxBillHost: () => null }));
vi.mock('@/components/ds/SwipeActions/SwipeActions', () => ({
  SwipeActions: ({ children, right }: { children: React.ReactNode; right?: { onTrigger?: () => void } }) => (
    <div>
      {right ? <button onClick={right.onTrigger}>swipe-left</button> : null}
      {children}
    </div>
  ),
}));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxScreen } from './InboxScreen';
import { action, DISMISS, inbox, item, SNOOZE } from './inboxTestUtils';

const epf = item({
  key: 'epf_match:e1:t1',
  kind: 'epf_match',
  section: 'needs_look',
  severity: 'info',
  title: 'EPF withdrawal ₹40,000 may match a bank credit',
  subtitle: 'NEFT CR EPFO MUMBAI · HDFC Bank ••4521 · 24 Feb 2025 · +₹40,000',
  href: '/investments/epf',
  refs: { epfEntryId: 'e1', transactionId: 't1' },
  actions: [action({ type: 'epf_link', label: 'Link' }), SNOOZE, action({ ...DISMISS, label: 'Not this one' })],
});

describe('InboxScreen, EPF suggestion row', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([epf]) } as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: undefined } as never);
  });

  it('shows the title, the credit and Not this one beside Link, without the dismiss icon', async () => {
    renderWithQuery(<InboxScreen />);
    expect(await screen.findByText('EPF withdrawal ₹40,000 may match a bank credit')).toBeInTheDocument();
    expect(screen.getByText(/NEFT CR EPFO MUMBAI/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not this one' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Link' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Dismiss/ })).toBeNull();
  });

  it('Link attaches the credit and the row goes away', async () => {
    renderWithQuery(<InboxScreen />);
    vi.mocked(api.PUT).mockImplementation(async () => {
      vi.mocked(api.GET).mockResolvedValue({ data: inbox([]) } as never);
      return { data: {} } as never;
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Link' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
        params: { path: { id: 'e1' } },
        body: { transactionId: 't1', recordTds: false },
      }),
    );
    await waitFor(() => expect(screen.queryByText(/may match a bank credit/)).toBeNull());
  });

  it('Not this one dismisses the suggestion and the row', async () => {
    renderWithQuery(<InboxScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Not this one' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.POST).mock.calls[0][0]).toBe('/api/v1/epf/entries/{id}/suggestion/dismiss');
    expect(vi.mocked(api.POST).mock.calls[1][0]).toBe('/api/v1/inbox/{key}/dismiss');
  });

  it('swiping left does the same as Not this one', async () => {
    renderWithQuery(<InboxScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'swipe-left' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.POST).mock.calls[0][0]).toBe('/api/v1/epf/entries/{id}/suggestion/dismiss');
  });
});
