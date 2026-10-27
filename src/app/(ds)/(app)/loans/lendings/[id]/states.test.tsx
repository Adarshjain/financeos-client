import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import DsPersonError from './error';
import DsPersonLoading from './loading';

vi.mock('next/navigation', () => ({
  usePathname: () => '/loans/lendings/p1',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('person page states', () => {
  it('loading keeps the top bar with its way back to Lendings', () => {
    render(<DsPersonLoading />);
    expect(screen.getByText('Owe & lend / Lendings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/loans/lendings');
  });

  it('an error says what failed, offers Try again and quotes the reference', () => {
    const reset = vi.fn();
    render(<DsPersonError error={Object.assign(new Error('x'), { digest: 'ref-9' })} reset={reset} />);
    expect(screen.getByText('Could not load this person')).toBeInTheDocument();
    expect(screen.getByText(/ref-9/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/loans/lendings');
  });
});
