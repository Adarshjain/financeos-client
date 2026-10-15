import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLongPress } from './useLongPress';

const TestComponent: React.FC<{
  onLongPress: () => void;
  disabled?: boolean;
}> = ({ onLongPress, disabled }) => {
  const longPress = useLongPress({ onLongPress, disabled });
  return (
    <button
      type="button"
      data-testid="target"
      {...longPress.handlers}
    >
      Target
    </button>
  );
};

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires on a held touch after 450 ms', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });
    expect(onLongPress).not.toHaveBeenCalled();

    // Fast-forward 440ms - not yet triggered
    vi.advanceTimersByTime(440);
    expect(onLongPress).not.toHaveBeenCalled();

    // Fast-forward 10ms (reaching 450ms)
    vi.advanceTimersByTime(10);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire on mouse input', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'mouse',
      clientX: 50,
      clientY: 50,
    });

    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('is cancelled by movement greater than 10px', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });

    vi.advanceTimersByTime(200);

    // Move by 15px (> 10px threshold)
    fireEvent.pointerMove(el, {
      pointerType: 'touch',
      clientX: 65,
      clientY: 50,
    });

    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('is cancelled by pointerUp before 450ms', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });

    vi.advanceTimersByTime(300);
    fireEvent.pointerUp(el, { pointerType: 'touch' });

    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('is cancelled by pointerCancel before 450ms', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });

    vi.advanceTimersByTime(300);
    fireEvent.pointerCancel(el, { pointerType: 'touch' });

    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not fire when disabled is true', () => {
    const onLongPress = vi.fn();
    render(<TestComponent onLongPress={onLongPress} disabled />);
    const el = screen.getByTestId('target');

    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });

    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
