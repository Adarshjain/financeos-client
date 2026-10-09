import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useElementSize } from '@/components/charts/useElementSize';

type Callback = (
  entries: { contentRect: { width: number; height: number } }[]
) => void;
const observers: {
  cb: Callback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

class FakeResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(cb: Callback) {
    observers.push({ cb, observe: this.observe, disconnect: this.disconnect });
  }
}

function Probe({ show = true }: { show?: boolean }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <>
      {show && <div ref={ref} />}
      <span data-testid="size">{`${size.width}x${size.height}`}</span>
    </>
  );
}

const original = window.ResizeObserver;
afterEach(() => {
  window.ResizeObserver = original;
  observers.length = 0;
});

describe('useElementSize', () => {
  it('starts at 0×0 and follows the observed content box', () => {
    window.ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
    render(<Probe />);
    expect(screen.getByTestId('size')).toHaveTextContent('0x0');
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledTimes(1);

    act(() => observers[0].cb([{ contentRect: { width: 320, height: 200 } }]));
    expect(screen.getByTestId('size')).toHaveTextContent('320x200');
  });

  it('disconnects when the element unmounts', () => {
    window.ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
    const { rerender } = render(<Probe />);
    rerender(<Probe show={false} />);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('stays at 0×0 when ResizeObserver is unavailable', () => {
    // @ts-expect-error simulating an environment without ResizeObserver
    window.ResizeObserver = undefined;
    render(<Probe />);
    expect(screen.getByTestId('size')).toHaveTextContent('0x0');
  });
});
