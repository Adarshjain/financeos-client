import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./InboxBillHost', () => ({ InboxBillHost: () => null }));
const dialog = vi.hoisted(() => vi.fn());
vi.mock('@/features/investments/lazyDialogs', () => ({
  loadCorporateActionDialog: () => Promise.resolve((props: Record<string, unknown>) => {
    dialog(props);
    return <div data-testid="ca-dialog" />;
  }),
}));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxScreen } from './InboxScreen';
import { action, DISMISS, inbox, item } from './inboxTestUtils';

const open = action({ type: 'open', label: 'Open', href: '/investments/corporate-actions' });
const applied = item({ key: 'ca_applied:s1', kind: 'corporate_action_applied', section: 'info', title: 'Bonus 1:1 applied to Acme Ltd', refs: { suggestionId: 's1', instrumentId: 'i1' }, actions: [open, DISMISS] });
const review = item({ key: 'ca_review:s2', kind: 'corporate_action_review', section: 'needs_look', title: 'Demerger on Beta Ltd', refs: { suggestionId: 's2', instrumentId: 'i2' }, actions: [open] });
const stopped = item({ key: 'stock_not_trading:i3', kind: 'stock_not_trading', section: 'needs_look', title: 'Gamma Ltd no longer trades', refs: { instrumentId: 'i3' }, actions: [open, DISMISS] });
const suggestion = { id: 's2', kind: 'demerger', status: 'pending', exDate: '2025-01-15', ratioFrom: 1, ratioTo: 1, instrument: { id: 'i2', name: 'Beta Ltd', symbol: 'BETA' } };

describe('InboxScreen, detected corporate actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockImplementation((async (path: string) => {
      if (path === '/api/v1/corporate-action-suggestions/{id}') return { data: suggestion };
      if (path === '/api/v1/instruments/{id}') return { data: { id: 'i3', name: 'Gamma Ltd', symbol: 'GAMMA' } };
      return { data: inbox([applied, review, stopped]) };
    }) as never);
    vi.mocked(api.POST).mockResolvedValue({ data: {} } as never);
  });

  it('Undo posts the undo and says Removed', async () => {
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id: 's1' } } }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Removed'));
  });

  it('Ignore dismisses the suggestion', async () => {
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ignore' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id: 's2' } } }));
  });

  it('Review opens the dialog from the suggestion: instrument, kind, date, ratio and its id', async () => {
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByTestId('ca-dialog')).toBeInTheDocument();
    expect(dialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        instrument: suggestion.instrument,
        type: 'demerger',
        prefill: { exDate: '2025-01-15', ratioFrom: 1, ratioTo: 1 },
        suggestionId: 's2',
      }),
    );
  });

  it('a kind the server could not name leaves the type unselected', async () => {
    vi.mocked(api.GET).mockImplementation((async (path: string) =>
      path === '/api/v1/corporate-action-suggestions/{id}' ? { data: { ...suggestion, kind: 'other' } } : { data: inbox([review]) }) as never);
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await screen.findByTestId('ca-dialog');
    expect(dialog.mock.lastCall?.[0].type).toBeUndefined();
  });

  it('Merged and Delisted open the dialog for the instrument with that type and no suggestion', async () => {
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Merged' }));
    await screen.findByTestId('ca-dialog');
    expect(dialog).toHaveBeenLastCalledWith(expect.objectContaining({ instrument: { id: 'i3', name: 'Gamma Ltd', symbol: 'GAMMA' }, type: 'merger' }));
    expect(dialog.mock.lastCall?.[0].suggestionId).toBeUndefined();
  });

  it('Delisted opens the dialog on the delisted kind', async () => {
    renderWithQuery(<InboxScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delisted' }));
    await screen.findByTestId('ca-dialog');
    expect(dialog).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'delisted' }));
  });
});
