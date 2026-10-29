import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '../useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedValue', () => {
  it('uses one 300 ms pause for search text', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it('starts as the value and follows it after the pause', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, SEARCH_DEBOUNCE_MS), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('starts as the initial value when given, so the first value waits for the pause too', () => {
    const { result } = renderHook(() => useDebouncedValue('abc', SEARCH_DEBOUNCE_MS, ''));
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current).toBe('abc');
  });
});
