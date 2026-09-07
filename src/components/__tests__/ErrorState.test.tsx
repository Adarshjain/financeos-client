import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorState } from '@/components/ErrorState';
import { DiagnosticsProvider } from '@/lib/diagnostics/DiagnosticsProvider';
import { navigateTo } from '@/lib/diagnostics/navigate';

vi.mock('@/lib/diagnostics/navigate', () => ({
  navigateTo: vi.fn(),
  setNavigator: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('ErrorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders inside DiagnosticsProvider with pageRequestId and separate digest', () => {
    const error = Object.assign(new Error('Server component crashed'), {
      digest: 'digest-456',
    });
    const reset = vi.fn();

    render(
      <DiagnosticsProvider pageRequestId="req-123" userId="user-1">
        <ErrorState error={error} reset={reset} />
      </DiagnosticsProvider>,
    );

    expect(screen.getByText('req-123')).toBeInTheDocument();
    expect(screen.getByText('digest-456')).toBeInTheDocument();
    expect(screen.getByText('Copy ID')).toBeInTheDocument();
    expect(screen.getByText('Debug')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('renders without provider using digest as ref', () => {
    const error = Object.assign(new Error('Root error'), {
      digest: 'digest-standalone',
    });
    const reset = vi.fn();

    render(<ErrorState error={error} reset={reset} />);

    expect(screen.getByText('digest-standalone')).toBeInTheDocument();
    expect(screen.getByText('Copy ID')).toBeInTheDocument();
    expect(screen.getByText('Debug')).toBeInTheDocument();
  });

  it('renders only Try again when no ref or digest exists', () => {
    const error = new Error('Generic error without ids');
    const reset = vi.fn();

    render(<ErrorState error={error} reset={reset} />);

    expect(screen.queryByText('Copy ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Debug')).not.toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('clicking Copy ID writes to clipboard and flips label to Copied', () => {
    vi.useFakeTimers();
    try {
      const error = Object.assign(new Error('Crashed'), { digest: 'digest-copy-1' });
      const reset = vi.fn();

      render(<ErrorState error={error} reset={reset} />);

      const copyBtn = screen.getByText('Copy ID');
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('digest-copy-1');
      expect(screen.getByText('Copied')).toBeInTheDocument();

      // After 2 seconds, reverts
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText('Copy ID')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking Debug calls navigateTo with encoded ref', () => {
    const error = Object.assign(new Error('Crashed'), { digest: 'digest-debug-1' });
    const reset = vi.fn();

    render(<ErrorState error={error} reset={reset} />);

    const debugBtn = screen.getByText('Debug');
    fireEvent.click(debugBtn);

    expect(navigateTo).toHaveBeenCalledWith('/debug?ref=digest-debug-1');
  });

  it('clicking Try again invokes reset callback', () => {
    const error = new Error('Crashed');
    const reset = vi.fn();

    render(<ErrorState error={error} reset={reset} />);

    const tryAgainBtn = screen.getByText('Try again');
    fireEvent.click(tryAgainBtn);

    expect(reset).toHaveBeenCalled();
  });
});
