import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNotFound } from './PageNotFound';
import { DS_HOME_HREF } from './routes';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

beforeEach(() => router.push.mockReset());

describe('PageNotFound', () => {
  it('defaults to Page not found with a way back to Home', () => {
    render(<PageNotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', DS_HOME_HREF);
  });

  it('goes back to the given parent through appHref', () => {
    render(<PageNotFound what="Account" backPath="/accounts" backLabel="Back to accounts" />);
    expect(screen.getByText('Account not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to accounts' })).toHaveAttribute('href', '/accounts');
  });

  it('keeps the app bar when given a shell', () => {
    render(<PageNotFound shell={{ title: 'Not found' }} />);
    expect(screen.getByRole('link', { name: 'Ask the data' })).toBeInTheDocument();
  });
});
