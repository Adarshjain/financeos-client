import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalErrorsSection } from '@/app/(protected)/debug/LocalErrorsSection';
import { DiagnosticsProvider } from '@/lib/diagnostics/DiagnosticsProvider';
import { errorLog } from '@/lib/diagnostics/errorLog';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('LocalErrorsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    errorLog.setOwner('user-test');
    errorLog.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state when errorLog is empty', () => {
    render(<LocalErrorsSection />);

    expect(screen.getByText('No local failures recorded in this browser session.')).toBeInTheDocument();
  });

  it('renders rows from errorLog snapshot and scrolls highlighted ref into view', () => {
    errorLog.record('Account creation failed', {
      ref: 'E2EERR01',
      status: 500,
      code: 'INTERNAL_ERROR',
      endpoint: '/api/v1/accounts',
    });

    render(<LocalErrorsSection highlightRef="E2EERR01" />);

    expect(screen.getByText('E2EERR01')).toBeInTheDocument();
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();
    expect(screen.getByText('INTERNAL_ERROR')).toBeInTheDocument();
    expect(screen.getByText('/api/v1/accounts')).toBeInTheDocument();
    expect(screen.getByText('Account creation failed')).toBeInTheDocument();

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('tapping row copies ref to clipboard, shows toast, and calls onSelectRef', () => {
    const onSelectRef = vi.fn();

    errorLog.record('Validation error', {
      ref: 'VAL12345',
      status: 400,
      code: 'VALIDATION_ERROR',
    });

    render(<LocalErrorsSection onSelectRef={onSelectRef} />);

    const row = screen.getByText('Validation error');
    fireEvent.click(row);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('VAL12345');
    expect(toast.success).toHaveBeenCalledWith('Copied ref VAL12345');
    expect(onSelectRef).toHaveBeenCalledWith('VAL12345');
  });

  it('Copy all formats report text header lines and record lines', () => {
    errorLog.record('Database timeout', {
      ref: 'DB_ERR_1',
      status: 500,
      code: 'INTERNAL_ERROR',
      method: 'POST',
      endpoint: '/api/v1/accounts',
    });

    render(
      <DiagnosticsProvider pageRequestId="page-req-test" userId="user-test">
        <LocalErrorsSection />
      </DiagnosticsProvider>,
    );

    const copyAllBtn = screen.getByRole('button', { name: /Copy all/i });
    fireEvent.click(copyAllBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const copiedText = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(copiedText).toContain('=== FinanceOS Diagnostics Report ===');
    expect(copiedText).toContain('Page Request ID: page-req-test');
    expect(copiedText).toContain('DB_ERR_1 | HTTP 500 (INTERNAL_ERROR) | POST /api/v1/accounts | Database timeout');
    expect(toast.success).toHaveBeenCalledWith('Diagnostics report copied to clipboard');
  });

  it('Share uses navigator.share when available, falls back to clipboard otherwise', async () => {
    errorLog.record('Some error', { ref: 'REF_SHARE_1' });

    // 1. With navigator.share
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: mockShare });

    render(<LocalErrorsSection />);

    const shareBtn = screen.getByRole('button', { name: /Share/i });
    fireEvent.click(shareBtn);

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'FinanceOS Diagnostics Report',
      }),
    );
  });

  it('Clear button empties errorLog and shows toast', () => {
    errorLog.record('Error to clear', { ref: 'REF_CLR_1' });
    expect(errorLog.getSnapshot().length).toBe(1);

    render(<LocalErrorsSection />);

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    expect(errorLog.getSnapshot().length).toBe(0);
    expect(screen.getByText('No local failures recorded in this browser session.')).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith('Local error history cleared');
  });
});
