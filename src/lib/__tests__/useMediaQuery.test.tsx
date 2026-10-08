import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BELOW_MD_QUERY, useMediaQuery } from '../useMediaQuery';

function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_: string, l: () => void) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: () => void) => listeners.delete(l)),
  };
  const mm = vi.fn(() => mql);
  vi.stubGlobal('matchMedia', mm);
  (window as any).matchMedia = mm;
  return {
    mm,
    mql,
    set(v: boolean) {
      matches = v;
      listeners.forEach((l) => l());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as any).matchMedia;
});

describe('useMediaQuery', () => {
  it('reflects the current match and queries with the given string', () => {
    const s = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 10px)'));
    expect(result.current).toBe(true);
    expect(s.mm).toHaveBeenCalledWith('(max-width: 10px)');
  });

  it('updates when the media query changes', () => {
    const s = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(x)'));
    expect(result.current).toBe(false);
    act(() => s.set(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const s = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(x)'));
    unmount();
    expect(s.mql.removeEventListener).toHaveBeenCalled();
  });

  it('without matchMedia support returns serverValue (default false)', () => {
    delete (window as any).matchMedia;
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useMediaQuery('(x)')).result.current).toBe(false);
    expect(renderHook(() => useMediaQuery('(x)', true)).result.current).toBe(true);
  });

  it('BELOW_MD_QUERY is the sub-768px query', () => {
    expect(BELOW_MD_QUERY).toBe('(max-width: 767.98px)');
  });
});
