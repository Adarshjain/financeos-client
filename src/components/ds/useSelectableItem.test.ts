import { act,renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSelectableItem } from './useSelectableItem';

describe('useSelectableItem', () => {
  it('determines isSelectable from selectable prop or onSelectedChange existence', () => {
    const { result: r1 } = renderHook(() => useSelectableItem({}));
    expect(r1.current.isSelectable).toBe(false);

    const { result: r2 } = renderHook(() =>
      useSelectableItem({ onSelectedChange: vi.fn() }),
    );
    expect(r2.current.isSelectable).toBe(true);

    const { result: r3 } = renderHook(() =>
      useSelectableItem({ selectable: false, onSelectedChange: vi.fn() }),
    );
    expect(r3.current.isSelectable).toBe(false);
  });

  it('toggles selection on click when selectable', () => {
    const onSelectedChange = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useSelectableItem({ selected: false, onSelectedChange, onClick }),
    );

    const fakeEvent = {
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLDivElement>;

    act(() => {
      result.current.handleClick(fakeEvent);
    });

    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(onClick).toHaveBeenCalledWith(fakeEvent);
  });

  it('skips toggle if consumeLongPress returns true', () => {
    const onSelectedChange = vi.fn();
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useSelectableItem({
        selected: false,
        onSelectedChange,
        onClick,
        consumeLongPress: () => true,
      }),
    );

    const fakeEvent = {} as React.MouseEvent<HTMLDivElement>;
    act(() => {
      result.current.handleClick(fakeEvent);
    });

    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('toggles on Enter or Space keydown when targeting current element', () => {
    const onSelectedChange = vi.fn();
    const { result } = renderHook(() =>
      useSelectableItem({ selected: false, onSelectedChange }),
    );

    const element = {} as HTMLElement;
    const preventDefault = vi.fn();
    const fakeEnter = {
      target: element,
      currentTarget: element,
      key: 'Enter',
      preventDefault,
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    act(() => {
      result.current.handleKeyDown(fakeEnter);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it('forwards onClick when not selectable but Enter/Space pressed', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() => useSelectableItem({ onClick }));

    const element = {} as HTMLElement;
    const preventDefault = vi.fn();
    const fakeSpace = {
      target: element,
      currentTarget: element,
      key: ' ',
      preventDefault,
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    act(() => {
      result.current.handleKeyDown(fakeSpace);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
  });
});
