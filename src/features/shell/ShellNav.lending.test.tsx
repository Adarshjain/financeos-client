import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { AddTradeProvider } from './AddTradeProvider';
import { ShellTabBar } from './ShellNav';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => '/accounts', useRouter: () => router }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/features/lendings/form/AddLendingDialog', () => ({
  AddLendingDialog: () => <p>lending dialog</p>,
}));

vi.mock('@/features/investments/tradebook/TradeDialog', () => ({
  RecordTradeDialog: () => <p>trade dialog</p>,
}));

describe('More sheet Quick add Lending', () => {
  it('opens the Add lending dialog from state, closes the sheet and leaves the URL alone', async () => {
    render(
      <AddLendingProvider>
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Menu/i }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lending/i }));

    expect(await screen.findByText('lending dialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Trade closes the sheet and opens Record trade from state', async () => {
    render(
      <AddTradeProvider>
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddTradeProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Trade/i }));

    expect(await screen.findByText('trade dialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
