import { afterEach, describe, expect, it, vi } from 'vitest';

import * as appLock from '@/lib/appLock';
import * as authExpiry from '@/lib/authExpiry';

import { EMPTY_SEARCH_RESULT, fetchGlobalSearch } from './searchApi';

afterEach(() => vi.unstubAllGlobals());

describe('fetchGlobalSearch', () => {
  it('GETs /api/v1/search with the encoded text, the cookie and the abort signal', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accounts: [{ id: '1' }] }) });
    vi.stubGlobal('fetch', fetchSpy);
    const signal = new AbortController().signal;

    const result = await fetchGlobalSearch('croma & co', signal);

    expect(fetchSpy.mock.calls[0][0]).toBe('/api/v1/search?q=croma%20%26%20co');
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'same-origin', signal });
    expect(result.accounts).toEqual([{ id: '1' }]);
    expect(result.loans).toEqual(EMPTY_SEARCH_RESULT.loans);
  });

  it('rejects on a non-2xx answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 423 }));
    await expect(fetchGlobalSearch('abc')).rejects.toThrow('423');
  });

  it('raises the session-expired event on a 401', async () => {
    const spy = vi.spyOn(authExpiry, 'notifyIfSessionExpired').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(fetchGlobalSearch('abc')).rejects.toThrow('401');
    expect(spy).toHaveBeenCalledWith({ status: 401 });
  });

  it('raises the app-locked event on a 423', async () => {
    const spy = vi.spyOn(appLock, 'notifyIfAppLocked').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 423 }));
    await expect(fetchGlobalSearch('abc')).rejects.toThrow('423');
    expect(spy).toHaveBeenCalledWith({ status: 423 });
  });
});
