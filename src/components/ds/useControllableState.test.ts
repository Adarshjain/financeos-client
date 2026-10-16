import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  it('manages uncontrolled state with defaultValue', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 'initial', onChange }),
    );

    expect(result.current[0]).toBe('initial');

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(onChange).toHaveBeenCalledWith('updated');
  });

  it('manages controlled state with value', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, onChange }),
      { initialProps: { value: 'first' } },
    );

    expect(result.current[0]).toBe('first');

    act(() => {
      result.current[1]('second');
    });

    // In controlled mode, state follows prop
    expect(onChange).toHaveBeenCalledWith('second');
    expect(result.current[0]).toBe('first');

    rerender({ value: 'second' });
    expect(result.current[0]).toBe('second');
  });

  it('accepts functional updater (prev => next)', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<number>({ defaultValue: 1, onChange }),
    );

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('skips onChange when value does not change', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: 'same', onChange }),
    );

    act(() => {
      result.current[1]('same');
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('warns in development when switching between controlled and uncontrolled', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ value }: { value?: string }) => useControllableState({ value }),
      { initialProps: { value: 'controlled' as string | undefined } },
    );

    rerender({ value: undefined });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('A component changed from controlled to uncontrolled'),
    );
    warnSpy.mockRestore();
  });
});
