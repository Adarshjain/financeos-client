import { afterEach, describe, expect, it, vi } from 'vitest';

import { pushUrl, replaceUrl } from '../urlState';

afterEach(() => vi.restoreAllMocks());

describe('replaceUrl', () => {
  it('rewrites the address and clears the state by default', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    replaceUrl('/transactions?type=debit');
    expect(spy).toHaveBeenCalledWith(null, '', '/transactions?type=debit');
  });

  it('keeps the current state when asked', () => {
    window.history.replaceState({ from: 'next' }, '', '/');
    const spy = vi.spyOn(window.history, 'replaceState');
    replaceUrl('/upcoming?months=3', { keepState: true });
    expect(spy).toHaveBeenCalledWith({ from: 'next' }, '', '/upcoming?months=3');
  });

  it('accepts a URL object', () => {
    replaceUrl(new URL('/reports?type=chart', window.location.origin));
    expect(window.location.pathname + window.location.search).toBe('/reports?type=chart');
  });
});

describe('pushUrl', () => {
  it('adds an entry with the state it was given', () => {
    const spy = vi.spyOn(window.history, 'pushState');
    pushUrl('/a', { n: 1 });
    expect(spy).toHaveBeenCalledWith({ n: 1 }, '', '/a');
  });
});
