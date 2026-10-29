import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddTransactionProvider } from '@/features/transactions/form/AddTransactionProvider';

import { ShellTabBar } from './ShellNav';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => '/accounts', useRouter: () => router }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
const formProps = vi.fn();
vi.mock('@/features/transactions/form/TransactionFormDialog', () => ({
  TransactionFormDialog: (props: { onClose: () => void; today: string; transaction?: unknown }) => {
    formProps(props);
    return <button onClick={props.onClose}>transaction form</button>;
  },
}));

describe('More sheet Quick add Transaction', () => {
  it('opens the Add transaction form from state, closes the sheet, leaves the URL alone, and closes after saving', async () => {
    render(
      <AddTransactionProvider today="2026-10-22">
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddTransactionProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /Transaction/i }));

    expect(await screen.findByText('transaction form')).toBeInTheDocument();
    expect(formProps.mock.calls[0][0]).toMatchObject({ today: '2026-10-22' });
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('transaction form'));
    expect(screen.queryByText('transaction form')).not.toBeInTheDocument();
  });
});
