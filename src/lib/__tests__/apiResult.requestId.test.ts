import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/apiClient';
import { apiResult, toErrorResult } from '@/lib/apiResult';

describe('apiResult.requestId', () => {
  it('preserves response.requestId when present in ApiError', () => {
    const error = new ApiError(500, {
      code: 'INTERNAL_ERROR',
      message: 'Server crashed',
      requestId: 'res-req-999',
    });

    const result = toErrorResult(error, 'Fallback');
    expect(result.success).toBe(false);
    expect(result.error.requestId).toBe('res-req-999');
    expect(result.error.code).toBe('INTERNAL_ERROR');
  });

  it('falls back to error.requestId when response lacks it', () => {
    const error = new ApiError(
      400,
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
      { requestId: 'option-req-888' },
    );

    const result = toErrorResult(error, 'Fallback');
    expect(result.success).toBe(false);
    expect(result.error.requestId).toBe('option-req-888');
  });

  it('sets requestId to null when neither response nor error has it', () => {
    const error = new ApiError(404, {
      code: 'NOT_FOUND',
      message: 'Not found',
    });

    const result = toErrorResult(error, 'Fallback');
    expect(result.success).toBe(false);
    expect(result.error.requestId).toBeNull();
  });

  it('handles apiResult wrapper failure returning structured error envelope with requestId', async () => {
    const error = new ApiError(500, {
      code: 'INTERNAL_ERROR',
      message: 'Database unavailable',
      requestId: 'async-req-777',
      errorId: 'ERR12345',
    });

    const result = await apiResult('Failed to load', async () => {
      throw error;
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.requestId).toBe('async-req-777');
      expect(result.error.errorId).toBe('ERR12345');
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });
});
