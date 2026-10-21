import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBulkSelection } from './useBulkSelection';

describe('useBulkSelection', () => {
  const page = ['a', 'b', 'c'];

  it('selects ids, selects the whole page, and clears', () => {
    const { result } = renderHook(() => useBulkSelection('k', page));
    act(() => result.current.select(['a']));
    expect(result.current.ids).toEqual(['a']);
    act(() => result.current.selectAll());
    expect(result.current.ids).toEqual(page);
    act(() => result.current.clear());
    expect(result.current.ids).toEqual([]);
  });

  it('starts from nothing when the page, filter or sort changes', () => {
    const { result, rerender } = renderHook(({ k }) => useBulkSelection(k, page), { initialProps: { k: 'page=0' } });
    act(() => result.current.select(['a', 'b']));
    rerender({ k: 'page=1' });
    expect(result.current.ids).toEqual([]);
    rerender({ k: 'page=0' });
    expect(result.current.ids).toEqual([]);
  });

  it('drops ids that left the page after a refresh', () => {
    const { result, rerender } = renderHook(({ ids }) => useBulkSelection('k', ids), { initialProps: { ids: page } });
    act(() => result.current.select(['a', 'b']));
    rerender({ ids: ['b', 'c'] });
    expect(result.current.ids).toEqual(['b']);
  });
});
