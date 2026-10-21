import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS, useSearchText } from './useSearchText';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useSearchText', () => {
  it('commits the trimmed text once typing has paused, not on every key', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSearchText('', onCommit));
    act(() => result.current.setText('p'));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    act(() => result.current.setText(' pri '));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('pri');
    expect(result.current.text).toBe(' pri ');
  });

  it('does not commit the text it started with', () => {
    const onCommit = vi.fn();
    renderHook(() => useSearchText('pri', onCommit));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits an emptied search', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSearchText('pri', onCommit));
    act(() => result.current.setText(''));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10));
    expect(onCommit).toHaveBeenCalledWith('');
  });

  it('takes the text from a q that changed from outside, without committing it back', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(({ q }) => useSearchText(q, onCommit), { initialProps: { q: 'pri' } });
    rerender({ q: '' });
    expect(result.current.text).toBe('');
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('keeps keys typed while its own commit travels', () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(({ q }) => useSearchText(q, onCommit), { initialProps: { q: '' } });
    act(() => result.current.setText('pri'));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10));
    expect(onCommit).toHaveBeenCalledWith('pri');
    act(() => result.current.setText('pria'));
    rerender({ q: 'pri' });
    expect(result.current.text).toBe('pria');
  });
});
