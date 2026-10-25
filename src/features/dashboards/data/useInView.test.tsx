import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IN_VIEW_ROOT_MARGIN, useInView } from './useInView';

type ObserverCallback = ConstructorParameters<typeof IntersectionObserver>[0];
type ObserverInit = ConstructorParameters<typeof IntersectionObserver>[1];

interface FakeObserver {
  callback: ObserverCallback;
  options?: ObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}
let observers: FakeObserver[] = [];

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback, options?: ObserverInit) {
    const fake: FakeObserver = { callback, options, observe: vi.fn(), disconnect: vi.fn() };
    observers.push(fake);
    return Object.assign(this, { observe: fake.observe, disconnect: fake.disconnect, unobserve: vi.fn(), takeRecords: () => [] });
  }
}

const intersect = (observer: FakeObserver, isIntersecting: boolean) =>
  act(() => observer.callback([{ isIntersecting } as IntersectionObserverEntry], observer as unknown as IntersectionObserver));

function Probe({ rootMargin }: { rootMargin?: string }) {
  const { ref, inView } = useInView(rootMargin);
  return (
    <div ref={ref} data-testid="probe">
      {inView ? 'in view' : 'out of view'}
    </div>
  );
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe('useInView', () => {
  it('is out of view until the element comes within the margin, observing it with a 200px root margin', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('out of view');
    expect(observers).toHaveLength(1);
    expect(observers[0].options).toEqual({ rootMargin: IN_VIEW_ROOT_MARGIN });
    expect(IN_VIEW_ROOT_MARGIN).toBe('200px');
    expect(observers[0].observe).toHaveBeenCalledWith(screen.getByTestId('probe'));
  });

  it('stays out of view for an entry that is not intersecting', () => {
    render(<Probe />);
    intersect(observers[0], false);
    expect(screen.getByTestId('probe')).toHaveTextContent('out of view');
  });

  it('turns true when the element intersects, stops observing, and stays true (fetch once)', () => {
    render(<Probe />);
    intersect(observers[0], true);
    expect(screen.getByTestId('probe')).toHaveTextContent('in view');
    expect(observers[0].disconnect).toHaveBeenCalled();
    // Scrolling away again does not unload it, and no second observer starts.
    expect(observers).toHaveLength(1);
  });

  it('takes a margin of its own', () => {
    render(<Probe rootMargin="0px" />);
    expect(observers[0].options).toEqual({ rootMargin: '0px' });
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('starts out of view on the first render everywhere (server markup and hydration agree)', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('IntersectionObserver', undefined);
    const html = renderToString(<Probe />);
    expect(html).toContain('out of view');
  });

  it('counts as in view where IntersectionObserver does not exist, so nothing is held back', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('IntersectionObserver', undefined);
    act(() => {
      render(<Probe />);
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('in view');
  });
});
