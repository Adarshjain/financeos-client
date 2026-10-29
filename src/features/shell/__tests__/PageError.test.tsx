import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PageError } from '../PageError';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

describe('PageError', () => {
  it('says what failed, how to fix it, and never shows the raw message', () => {
    render(<PageError error={Object.assign(new Error('SQL boom'), { digest: 'abc123' })} reset={vi.fn()} what="this loan" />);
    expect(screen.getByText("Couldn't load this loan")).toBeInTheDocument();
    expect(screen.getByText(/Quote the reference/)).toBeInTheDocument();
    expect(screen.queryByText(/SQL boom/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy reference abc123' })).toBeInTheDocument();
  });

  it('Retry refreshes the server payload and resets', () => {
    refresh.mockClear();
    const reset = vi.fn();
    render(<PageError error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('uses Next unstable_retry when the boundary provides it', () => {
    refresh.mockClear();
    const reset = vi.fn();
    const retry = vi.fn();
    render(<PageError error={new Error('x')} reset={reset} unstable_retry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it('defaults to "this page" and Retry calls reset', () => {
    const reset = vi.fn();
    render(<PageError error={new Error('x')} reset={reset} />);
    expect(screen.getByText("Couldn't load this page")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('keeps the app bar when given a shell', () => {
    render(<PageError error={new Error('x')} reset={vi.fn()} shell={{ title: 'Transactions' }} />);
    expect(screen.getByRole('link', { name: 'Ask the data' })).toBeInTheDocument();
  });
});
