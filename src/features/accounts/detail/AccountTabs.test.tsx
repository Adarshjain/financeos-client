import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountType } from '@/lib/types';

import { AccountTabs } from './AccountTabs';

let pathname = '/accounts/a1';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { GET: (...args: unknown[]) => get(...args) } }));

function renderTabs(type: AccountType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountTabs accountId="a1" type={type} />
    </QueryClientProvider>,
  );
}

describe('AccountTabs', () => {
  beforeEach(() => {
    pathname = '/accounts/a1';
    get.mockReset();
    get.mockResolvedValue({ data: { statements: 3, cards: 2, transactions: 142 } });
  });

  it('links the four tabs of a credit card to their routes', async () => {
    renderTabs(AccountType.CREDIT_CARD);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/ · \d+$/, ''))).toEqual([
      'Overview',
      'Statements',
      'Cards',
      'Rewards',
    ]);
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual([
      '/accounts/a1',
      '/accounts/a1/statements',
      '/accounts/a1/cards',
      '/accounts/a1/rewards',
    ]);
    await screen.findByText('· 3');
  });

  it('shows two tabs for a wallet and no strip for a broker', () => {
    const { unmount } = renderTabs(AccountType.GENERIC);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Rewards']);
    unmount();

    renderTabs(AccountType.BROKER);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('adds the counts only after tab-counts arrives', async () => {
    let resolve!: (v: unknown) => void;
    get.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTabs(AccountType.CREDIT_CARD);

    expect(screen.queryByText('· 3')).toBeNull();
    resolve({ data: { statements: 3, cards: 2, transactions: 142 } });

    expect(await screen.findByText('· 3')).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/accounts/{id}/tab-counts', {
      params: { path: { id: 'a1' } },
    });
  });

  it('marks the tab the route is on', () => {
    pathname = '/accounts/a1/statements';
    renderTabs(AccountType.BANK_ACCOUNT);
    expect(screen.getByRole('tab', { name: /Statements/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows no counts when tab-counts fails', async () => {
    get.mockRejectedValue(new Error('down'));
    renderTabs(AccountType.CREDIT_CARD);
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByText(/^· \d/)).toBeNull();
  });
});
