import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/apiClient';
import { apiResult, AppError, toErrorResult, validationError } from '@/lib/apiResult';

describe('apiResult and error helpers (CD-14)', () => {
  it('instantiates AppError with default and custom code', () => {
    const err1 = new AppError('Something failed');
    expect(err1.message).toBe('Something failed');
    expect(err1.code).toBe('APP_ERROR');
    expect(err1.name).toBe('AppError');

    const err2 = new AppError('Custom error', 'CUSTOM_CODE');
    expect(err2.code).toBe('CUSTOM_CODE');
  });

  it('maps ApiError to failure result in toErrorResult', () => {
    const apiErr = new ApiError(404, {
      code: 'RESOURCE_NOT_FOUND',
      message: 'Not found',
      timestamp: '2026-07-25T00:00:00Z',
    });

    const res = toErrorResult(apiErr, 'Fallback message');
    expect(res).toEqual({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Not found',
        timestamp: '2026-07-25T00:00:00Z',
      },
    });
  });

  it('maps AppError to failure result in toErrorResult', () => {
    const appErr = new AppError('User error message', 'USER_BAD_INPUT');
    const res = toErrorResult(appErr, 'Fallback message');

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('USER_BAD_INPUT');
    expect(res.error.message).toBe('User error message');
    expect(typeof res.error.timestamp).toBe('string');
  });

  it('maps unknown error to fallback message in toErrorResult', () => {
    const unknownErr = new Error('Generic explosion');
    const res = toErrorResult(unknownErr, 'Action failed');

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('UNKNOWN_ERROR');
    expect(res.error.message).toBe('Action failed');
  });

  it('creates validationError with VALIDATION_ERROR code', () => {
    const res = validationError('Field is required');

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('VALIDATION_ERROR');
    expect(res.error.message).toBe('Field is required');
  });

  it('returns success data when apiResult succeeds', async () => {
    const res = await apiResult('Failed', async () => {
      return { id: '123', name: 'Test' };
    });

    expect(res).toEqual({
      success: true,
      data: { id: '123', name: 'Test' },
    });
  });

  it('catches exception and returns toErrorResult when apiResult throws', async () => {
    const res = await apiResult('Action failed', async () => {
      throw new AppError('Invalid operation', 'INVALID_OP');
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe('INVALID_OP');
      expect(res.error.message).toBe('Invalid operation');
    }
  });
});
