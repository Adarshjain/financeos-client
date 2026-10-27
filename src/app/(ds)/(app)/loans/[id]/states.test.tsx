import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DsLoanError from './error';
import DsLoanLoading from './loading';

vi.mock('next/navigation', () => ({
  usePathname: () => '/loans/l1',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('loan page states', () => {
  it('loading keeps the top bar with its way back to the loans', () => {
    render(<DsLoanLoading />);
    expect(screen.getByText('Owe & lend / Loans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/loans');
  });

  it('an error says what failed, offers Try again and quotes the reference', () => {
    const reset = vi.fn();
    render(<DsLoanError error={Object.assign(new Error('x'), { digest: 'ref-9' })} reset={reset} />);
    expect(screen.getByText('Could not load this loan')).toBeInTheDocument();
    expect(screen.getByText(/ref-9/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/loans');
  });
});
