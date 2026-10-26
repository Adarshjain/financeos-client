import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellRail } from '../ShellNav';
import { ShellPage } from '../ShellPage';
import { EMPTY_SEARCH_RESULT, fetchGlobalSearch } from './searchApi';
import { SearchProvider } from './SearchProvider';

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/ds/accounts', useRouter: () => router }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
const openDialog = vi.hoisted(() => vi.fn());
vi.mock('../quickAdd', () => ({ useOpenQuickAddDialog: () => openDialog }));
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

  it('lists the pages and actions before any text, and no Ask row', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('option', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lending' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Ask the data:/ })).toBeNull();
  });

  it('lists the footer page Settings too', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.click(screen.getByRole('option', { name: 'Settings' }));
    expect(router.push).toHaveBeenCalledWith('/ds/settings');
  });

  it('goes to a page and closes when its row is picked', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.click(screen.getByRole('option', { name: 'Transactions' }));
    expect(router.push).toHaveBeenCalledWith('/ds/transactions');
    expect(palette()).toBeNull();
  });

  it('runs a Quick add action, opening its dialog, and closes', () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
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
    expect(router.push).toHaveBeenCalledWith('/ds/accounts/a1');
    expect(palette()).toBeNull();
  });

  it('opens the Ask the data page from the Ask row', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'regalia spend' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Ask the data: regalia spend' }));
    expect(router.push).toHaveBeenCalledWith('/chat');
  });

  it('clears the text when the palette closes', async () => {
    renderShell();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(field(), { target: { value: 'hdf' } });
    await screen.findByRole('option', { name: /Regalia/ });
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeNull();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => expect(field()).toHaveValue(''));
  });
});
