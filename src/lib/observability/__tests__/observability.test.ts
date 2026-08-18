import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/apiClient';
import { AppError,toErrorResult } from '@/lib/apiResult';
import { logger } from '@/lib/observability/logger';

describe('Observability Unit Tests', () => {
  it('toErrorResult emits client.action.failed with Java errorId when ApiError carries one', () => {
    const logSpy = vi.spyOn(logger, 'log');

    const apiErrorWithId = new ApiError(500, {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
      errorId: 'ERR_12345',
      timestamp: new Date().toISOString(),
    });

    const result = toErrorResult(apiErrorWithId, 'Fallback message');

    expect(result.success).toBe(false);
    expect(result.error.errorId).toBe('ERR_12345');
    expect(logSpy).toHaveBeenCalledWith('ERROR', 'client.action.failed', {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
      errorId: 'ERR_12345',
      fallbackMessage: 'Fallback message',
    });
  });

  it('toErrorResult emits client.action.failed without errorId when error does not carry one', () => {
    const logSpy = vi.spyOn(logger, 'log');

    const appError = new AppError('Invalid input', 'VALIDATION_FAILED');
    const result = toErrorResult(appError, 'Fallback message');

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_FAILED');
    expect(logSpy).toHaveBeenCalledWith('ERROR', 'client.action.failed', {
      code: 'VALIDATION_FAILED',
      message: 'Invalid input',
      fallbackMessage: 'Fallback message',
    });
  });

  it('logger.ts swallows flush errors without throwing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    expect(() => {
      logger.log('INFO', 'client.test', { test: true });
    }).not.toThrow();

    fetchSpy.mockRestore();
  });

  it('GRAFANA_CLOUD_TOKEN does not leak into NEXT_PUBLIC_ variables', () => {
    const publicEnvKeys = Object.keys(process.env).filter((key) => key.startsWith('NEXT_PUBLIC_'));
    const tokenInPublicEnv = publicEnvKeys.some((key) => key.includes('CLOUD_TOKEN') || key.includes('LOKI'));
    expect(tokenInPublicEnv).toBe(false);
  });
});
