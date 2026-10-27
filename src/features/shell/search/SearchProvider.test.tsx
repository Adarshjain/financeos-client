import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellRail } from '../ShellNav';
import { ShellPage } from '../ShellPage';
import { EMPTY_SEARCH_RESULT, fetchGlobalSearch } from './searchApi';
import { SearchProvider } from './SearchProvider';

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/accounts', useRouter: () => router }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
const openDialog = vi.hoisted(() => vi.fn());
vi.mock('../quickAdd', () => ({ useOpenQuickAddDialog: () => openDialog }));
const markPaidProps = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));
vi.mock('@/features/bills/MarkPaidDialog', () => ({
  MarkPaidDialog: (props: Record<string, unknown> & { open: boolean; onMarked: () => void }) => {
    markPaidProps.last = props;
    return props.open ? <button onClick={props.onMarked}>mark paid dialog</button> : null;
  },
}));
const addTransaction = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/features/transactions/form/AddTransactionProvider', () => ({ useAddTransaction: () => addTransaction }));
vi.mock('./searchApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./searchApi')>()),
  fetchGlobalSearch: vi.fn(),
}));

const fetchMock = vi.mocked(fetchGlobalSearch);

function renderShell() {
  return render(
    <SearchProvider>
      <ShellRail user={{ email: 'arjun@example.test' }} />
      <ShellPage title="Accounts">content</ShellPage>
    </SearchProvider>,
  );
}

const palette = () => screen.queryByRole('dialog', { name: 'Search' });
const field = () => screen.getByRole('searchbox');

beforeEach(() => {
  router.push.mockReset();
  openDialog.mockReset();
  addTransaction.open.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ...EMPTY_SEARCH_RESULT,
    accounts: [{ id: 'a1', name: 'HDFC Regalia Gold', bank: 'HDFC', type: 'CREDIT_CARD', last4: '7741' }],
  });
});

describe('SearchProvider', () => {
  it('is closed at first', () => {
    renderShell();
    expect(palette()).toBeNull();
  });

  it('opens from the Rail Search field', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: /Search.*⌘K/ }));
    expect(palette()).toBeInTheDocument();
  });

  it('opens from the top-bar Search button', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(palette()).toBeInTheDocument();
  });

  it('toggles with ⌘K and Ctrl+K', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeNull();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(palette()).toBeInTheDocument();
  });

  it('shows nothing before any text', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists the footer page Settings too', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'se' } });
    fireEvent.click(screen.getByRole('option', { name: 'Settings' }));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('goes to a page and closes when its row is picked', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'tr' } });
    fireEvent.click(screen.getByRole('option', { name: 'Transactions' }));
    expect(router.push).toHaveBeenCalledWith('/transactions');
    expect(palette()).toBeNull();
  });

  it('runs a Quick add action, opening its dialog, and closes', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'tr' } });
    fireEvent.click(screen.getByRole('option', { name: 'Trade' }));
    expect(openDialog).toHaveBeenCalledWith('trade');
    expect(router.push).not.toHaveBeenCalled();
    expect(palette()).toBeNull();
  });

  it('sends no request for 2 characters, searches at 3 and opens a result', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'hd' } });
    await new Promise((r) => setTimeout(r, 300));
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(field(), { target: { value: 'hdf' } });
    const row = await screen.findByRole('option', { name: 'HDFC Regalia Gold · ••7741' });
    expect(fetchMock.mock.calls[0][0]).toBe('hdf');
    fireEvent.click(row);
    expect(router.push).toHaveBeenCalledWith('/accounts/a1');
    expect(palette()).toBeNull();
  });

  it('opens the Ask the data page from the Ask row', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'regalia spend' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Ask the data: regalia spend' }));
    expect(router.push).toHaveBeenCalledWith('/chat?q=regalia%20spend');
  });

  it('asks again when the palette is opened again, since what it cached may have changed elsewhere', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'hdf' } });
    await screen.findByRole('option', { name: 'HDFC Regalia Gold · ••7741' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.click(screen.getByRole('button', { name: /Search.*⌘K/ }));
    fireEvent.change(field(), { target: { value: 'hdf' } });
    await screen.findByRole('option', { name: 'HDFC Regalia Gold · ••7741' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('clears the text when the palette closes', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'hdf' } });
    await screen.findByRole('option', { name: 'HDFC Regalia Gold · ••7741' });
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeNull();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => expect(field()).toHaveValue(''));
  });

  it('adds a transaction on the first matched account from its action', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'hdf' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Add transaction on HDFC Regalia Gold' }));
    expect(addTransaction.open).toHaveBeenCalledWith({ defaultAccountId: 'a1' });
    expect(palette()).toBeNull();
  });

  it('shows the nudge for 1 or 2 characters and not from 3', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'tr' } });
    expect(screen.getByText(/Type 3 or more characters/)).toBeInTheDocument();
    fireEvent.change(field(), { target: { value: 'tra' } });
    expect(screen.queryByText(/Type 3 or more characters/)).toBeNull();
  });

  describe('Mark paid', () => {
    const card = {
      id: 'a1', name: 'HDFC Regalia Gold', bank: 'HDFC', type: 'credit_card', last4: '7741',
      openBill: { statementId: 's1', remainingAmount: 44319, paymentDueDate: '2026-10-30' },
    };

    it('closes the palette and opens the Mark paid dialog for the unpaid bill', async () => {
      fetchMock.mockResolvedValue({ ...EMPTY_SEARCH_RESULT, accounts: [card] });
      renderShell();
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      fireEvent.change(field(), { target: { value: 'hdf' } });
      fireEvent.click(await screen.findByRole('option', { name: 'Mark HDFC Regalia Gold bill paid' }));

      expect(palette()).toBeNull();
      expect(screen.getByText('mark paid dialog')).toBeInTheDocument();
      expect(markPaidProps.last).toMatchObject({
        open: true,
        statementId: 's1',
        cardName: 'HDFC Regalia Gold',
        remaining: 44319,
      });
    });

    it('drops the cached answers after paying, so the next search asks again', async () => {
      fetchMock.mockResolvedValue({ ...EMPTY_SEARCH_RESULT, accounts: [card] });
      renderShell();
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      fireEvent.change(field(), { target: { value: 'hdf' } });
      fireEvent.click(await screen.findByRole('option', { name: 'Mark HDFC Regalia Gold bill paid' }));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockResolvedValue({ ...EMPTY_SEARCH_RESULT, accounts: [{ ...card, openBill: null }] });
      fireEvent.click(screen.getByText('mark paid dialog'));
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      fireEvent.change(field(), { target: { value: 'hdf' } });
      await screen.findByRole('option', { name: 'Add transaction on HDFC Regalia Gold' });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(screen.queryByRole('option', { name: 'Mark HDFC Regalia Gold bill paid' })).toBeNull();
    });
  });
});
