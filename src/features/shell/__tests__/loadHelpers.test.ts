import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { loaded, orNull } from '../loadHelpers';

describe('loadHelpers', () => {
  it('orNull passes a value through and turns a rejection into null', async () => {
    await expect(orNull(Promise.resolve(5))).resolves.toBe(5);
    await expect(orNull(Promise.reject(new Error('x')))).resolves.toBeNull();
  });

  it('loaded wraps a value, and a failure with the request id when there is one', async () => {
    await expect(loaded(Promise.resolve('a'))).resolves.toEqual({ ok: true, data: 'a' });
    const api = new ApiError(500, { code: 'X', message: 'boom', timestamp: '' }, { requestId: 'req-1' });
    await expect(loaded(Promise.reject(api))).resolves.toEqual({ ok: false, reference: 'req-1' });
    await expect(loaded(Promise.reject(new Error('x')))).resolves.toEqual({ ok: false, reference: undefined });
  });
});
