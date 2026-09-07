import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { AppError } from '@/lib/appError';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { navigateTo } from '@/lib/diagnostics/navigate';
import { toastError, toastErrorResult } from '@/lib/toastError';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/diagnostics/navigate', () => ({
  navigateTo: vi.fn(),
}));

describe('toastError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorLog.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles ApiError with status 500 and errorId (duration 8000, description, Copy ID, Debug)', () => {
    const error = Object.assign(
      new ApiError(
        500,
        {
          code: 'INTERNAL_ERROR',
          message: 'Server failure message',
          errorId: 'E2EERR01',
          requestId: 'req-500',
        },
        { endpoint: '/api/v1/accounts', method: 'POST', requestId: 'req-500' },
      ),
      { errorId: 'E2EERR01' },
    );

    toastError(error, 'Fallback message');

    expect(toast.error).toHaveBeenCalledWith(
      'Server failure message',
      expect.objectContaining({
        description: 'Ref E2EERR01',
        duration: 8000,
        action: expect.objectContaining({ label: 'Copy ID' }),
        cancel: expect.objectContaining({ label: 'Debug' }),
      }),
    );

    // Test Action click (Copy ID)
    const toastCall = vi.mocked(toast.error).mock.calls[0][1] as {
      action?: { onClick?: (ev: unknown) => void };
      cancel?: { onClick?: (ev: unknown) => void };
    };
    const preventDefault = vi.fn();
    toastCall?.action?.onClick?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('E2EERR01');

    // Test Cancel click (Debug)
    toastCall?.cancel?.onClick?.({});
    expect(navigateTo).toHaveBeenCalledWith('/debug?ref=E2EERR01');

    // Verify errorLog recorded it
    expect(errorLog.getSnapshot().length).toBe(1);
    expect(errorLog.getSnapshot()[0].ref).toBe('E2EERR01');
  });

  it('handles ApiError with status 400 (duration 5000)', () => {
    const error = new ApiError(
      400,
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        requestId: 'req-400',
      },
      { endpoint: '/api/v1/accounts', method: 'GET', requestId: 'req-400' },
    );

    toastError(error, 'Fallback');

    expect(toast.error).toHaveBeenCalledWith(
      'Invalid input',
      expect.objectContaining({
        description: 'Ref req-400',
        duration: 5000,
      }),
    );
  });

  it('handles status 0 network error with duration 8000', () => {
    const error = new ApiError(
      0,
      {
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch',
        requestId: 'req-net-0',
      },
      { requestId: 'req-net-0' },
    );

    toastError(error, 'Fallback');

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to fetch',
      expect.objectContaining({
        description: 'Ref req-net-0',
        duration: 8000,
      }),
    );
  });

  it('handles AppError without ref (no description/action/cancel)', () => {
    const appErr = new AppError('Please sign in', 'AUTH_REQUIRED');

    toastError(appErr, 'Fallback');

    expect(toast.error).toHaveBeenCalledWith(
      'Please sign in',
      expect.objectContaining({
        description: undefined,
        action: undefined,
        cancel: undefined,
      }),
    );
  });

  it('handles string, {message} object, blank message fallback, and unknown error inputs', () => {
    toastError('Direct string error', 'Fallback');
    expect(toast.error).toHaveBeenCalledWith('Direct string error', expect.anything());

    toastError({ message: 'Object error message' }, 'Fallback');
    expect(toast.error).toHaveBeenCalledWith('Object error message', expect.anything());

    toastError({ message: '   ' }, 'Fallback');
    expect(toast.error).toHaveBeenCalledWith('Fallback', expect.anything());

    toastError(null, 'Fallback');
    expect(toast.error).toHaveBeenCalledWith('Fallback', expect.anything());
  });

  it('toastErrorResult records with source action and shows toast', () => {
    toastErrorResult(
      {
        code: 'CONFLICT',
        message: 'Account already exists',
        requestId: 'req-action-1',
      },
      'Action fallback',
    );

    expect(toast.error).toHaveBeenCalledWith(
      'Account already exists',
      expect.objectContaining({
        description: 'Ref req-action-1',
      }),
    );

    expect(errorLog.getSnapshot()[0].source).toBe('action');
    expect(errorLog.getSnapshot()[0].ref).toBe('req-action-1');
  });
});
