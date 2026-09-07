import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getFaro } from '@/instrumentation-client';
import { ApiError } from '@/lib/api/client';
import { errorLog } from '@/lib/diagnostics/errorLog';

vi.mock('@/instrumentation-client', () => ({
  getFaro: vi.fn(),
}));

describe('errorLog ring buffer', () => {
  const mockFaro = {
    api: {
      getSession: vi.fn().mockReturnValue({ id: 'faro-sess-1' }),
      pushError: vi.fn(),
    },
  };

  beforeEach(() => {
    window.localStorage.clear();
    errorLog.setOwner(null);
    errorLog.clear();
    vi.mocked(getFaro).mockReturnValue(mockFaro as never);
    mockFaro.api.pushError.mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('records from ApiError with source api when status > 0', () => {
    const apiErr = new ApiError(
      404,
      {
        code: 'NOT_FOUND',
        message: 'Account not found',
        errorId: 'E2ENOT01',
        requestId: 'req-404',
      },
      { endpoint: '/api/v1/accounts', method: 'GET', requestId: 'req-404' },
    );

    const rec = errorLog.record(apiErr);
    expect(rec.status).toBe(404);
    expect(rec.code).toBe('NOT_FOUND');
    expect(rec.message).toBe('Account not found');
    expect(rec.errorId).toBe('E2ENOT01');
    expect(rec.requestId).toBe('req-404');
    expect(rec.endpoint).toBe('/api/v1/accounts');
    expect(rec.method).toBe('GET');
    expect(rec.source).toBe('api');
    expect(rec.ref).toBe('E2ENOT01');

    expect(mockFaro.api.pushError).toHaveBeenCalledWith(
      apiErr,
      expect.objectContaining({
        context: {
          requestId: 'req-404',
          errorId: 'E2ENOT01',
          endpoint: '/api/v1/accounts',
          code: 'NOT_FOUND',
        },
      }),
    );
  });

  it('records from ApiError with source network when status is 0', () => {
    const netErr = new ApiError(
      0,
      {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        requestId: 'req-net-1',
      },
      { endpoint: '/api/v1/transactions', method: 'POST', requestId: 'req-net-1' },
    );

    const rec = errorLog.record(netErr);
    expect(rec.status).toBe(0);
    expect(rec.source).toBe('network');
    expect(rec.ref).toBe('req-net-1');
  });

  it('records context source action or boundary', () => {
    const rec1 = errorLog.record(new Error('Action failed'), { source: 'action' });
    expect(rec1.source).toBe('action');

    const rec2 = errorLog.record(new Error('Render crashed'), { source: 'boundary' });
    expect(rec2.source).toBe('boundary');
  });

  it('records from plain object and extracts digest/errorId/requestId', () => {
    const rec = errorLog.record({
      code: 'CUSTOM_ERR',
      message: 'Custom failure',
      digest: 'digest-abc',
      status: 422,
    });

    expect(rec.code).toBe('CUSTOM_ERR');
    expect(rec.message).toBe('Custom failure');
    expect(rec.ref).toBe('digest-abc');
    expect(rec.status).toBe(422);
    // Plain object must not call pushError
    expect(mockFaro.api.pushError).not.toHaveBeenCalled();
  });

  it('records from string and uses defaults for unknown', () => {
    const recStr = errorLog.record('Simple error message');
    expect(recStr.message).toBe('Simple error message');
    expect(recStr.code).toBe('UNKNOWN_ERROR');
    expect(recStr.ref).toBe('unknown');

    const recUnknown = errorLog.record(12345);
    expect(recUnknown.message).toBe('An unexpected error occurred');
    expect(recUnknown.ref).toBe('unknown');
  });

  it('follows ref precedence: errorId -> requestId -> digest -> unknown', () => {
    const rec1 = errorLog.record({
      errorId: 'ERR11111',
      requestId: 'REQ22222',
      digest: 'DIG33333',
    });
    expect(rec1.ref).toBe('ERR11111');

    const rec2 = errorLog.record({
      requestId: 'REQ22222',
      digest: 'DIG33333',
    });
    expect(rec2.ref).toBe('REQ22222');

    const rec3 = errorLog.record({
      digest: 'DIG33333',
    });
    expect(rec3.ref).toBe('DIG33333');

    const rec4 = errorLog.record({});
    expect(rec4.ref).toBe('unknown');
  });

  it('enforces capacity 20 with newest records first', () => {
    for (let i = 1; i <= 25; i++) {
      errorLog.record(`Message ${i}`, { ref: `ref-${i}` });
    }

    const snapshot = errorLog.getSnapshot();
    expect(snapshot.length).toBe(20);
    expect(snapshot[0].message).toBe('Message 25');
    expect(snapshot[19].message).toBe('Message 6');
  });

  it('handles setOwner: same userId keeps records, different userId clears records', () => {
    errorLog.setOwner('user-1');
    errorLog.record('Error 1', { ref: 'ref-1' });
    expect(errorLog.getSnapshot().length).toBe(1);

    // Same user -> keeps
    errorLog.setOwner('user-1');
    expect(errorLog.getSnapshot().length).toBe(1);

    // Different user -> clears
    errorLog.setOwner('user-2');
    expect(errorLog.getSnapshot().length).toBe(0);
  });

  it('clear() empties records and updates localStorage', () => {
    errorLog.record('Err 1', { ref: 'ref-1' });
    expect(errorLog.getSnapshot().length).toBe(1);

    errorLog.clear();
    expect(errorLog.getSnapshot().length).toBe(0);
  });

  it('deduplicates and merges same ref and code within 3 seconds', () => {
    vi.useFakeTimers();
    try {
      const now = new Date('2026-09-01T12:00:00.000Z');
      vi.setSystemTime(now);

      errorLog.record('Short msg', { ref: 'DEDUP001', code: 'INTERNAL_ERROR' });
      expect(errorLog.getSnapshot().length).toBe(1);
      expect(errorLog.getSnapshot()[0].message).toBe('Short msg');

      // 1.5s later, same ref + code with longer message
      vi.setSystemTime(new Date('2026-09-01T12:00:01.500Z'));
      errorLog.record('Much longer error message explaining the details', {
        ref: 'DEDUP001',
        code: 'INTERNAL_ERROR',
        requestId: 'req-dedup-merged',
      });

      // Merges in place (count stays 1, longer message wins, missing ids filled)
      expect(errorLog.getSnapshot().length).toBe(1);
      expect(errorLog.getSnapshot()[0].message).toBe('Much longer error message explaining the details');
      expect(errorLog.getSnapshot()[0].requestId).toBe('req-dedup-merged');

      // 4 seconds later (>3s), should append as a new entry
      vi.setSystemTime(new Date('2026-09-01T12:00:06.000Z'));
      errorLog.record('Another occurrence after 4s', { ref: 'DEDUP001', code: 'INTERNAL_ERROR' });
      expect(errorLog.getSnapshot().length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never merges ref=unknown', () => {
    errorLog.record('Unknown err 1', { ref: 'unknown', code: 'ERR' });
    errorLog.record('Unknown err 2', { ref: 'unknown', code: 'ERR' });

    expect(errorLog.getSnapshot().length).toBe(2);
  });

  it('tolerates throwing localStorage.setItem gracefully', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      errorLog.record('Err with broken storage', { ref: 'ref-safe' });
    }).not.toThrow();
    expect(errorLog.getSnapshot().length).toBe(1);
  });

  it('notifies subscribers on record, clear, and owner change', () => {
    const listener = vi.fn();
    const unsubscribe = errorLog.subscribe(listener);

    errorLog.record('Msg 1', { ref: 'ref-1' });
    expect(listener).toHaveBeenCalledTimes(1);

    errorLog.clear();
    expect(listener).toHaveBeenCalledTimes(2);

    errorLog.setOwner('new-user');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    errorLog.record('Msg 2', { ref: 'ref-2' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
