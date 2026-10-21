import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { ShellTabBar } from '../ShellNav';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => '/ds/accounts', useRouter: () => router }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/features/lendings/form/AddLendingDialog', () => ({
  AddLendingDialog: () => <p>lending dialog</p>,
}));

describe('More sheet Quick add Lending', () => {
  it('opens the Add lending dialog from state, closes the sheet and leaves the URL alone', () => {
    render(
      <AddLendingProvider>
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /More/i }));
    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lending/i }));

    expect(screen.getByText('lending dialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps Transaction and Trade disabled', () => {
    render(
      <AddLendingProvider>
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /More/i }));
    expect(screen.getByRole('button', { name: /Transaction/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Trade/i })).toBeDisabled();
  });
});
