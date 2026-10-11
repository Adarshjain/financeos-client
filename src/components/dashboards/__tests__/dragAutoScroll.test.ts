import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTO_SCROLL_EDGE_BOTTOM,
  AUTO_SCROLL_EDGE_TOP,
  AUTO_SCROLL_MAX_STEP,
  autoScrollStep,
  startDragAutoScroll,
} from '@/components/dashboards/dragAutoScroll';

const HEIGHT = 800;

describe('autoScrollStep', () => {
  it('is 0 between the two edge zones', () => {
    expect(autoScrollStep(AUTO_SCROLL_EDGE_TOP, HEIGHT)).toBe(0);
    expect(autoScrollStep(HEIGHT / 2, HEIGHT)).toBe(0);
    expect(autoScrollStep(HEIGHT - AUTO_SCROLL_EDGE_BOTTOM, HEIGHT)).toBe(0);
  });

  it('scrolls up near the top, fastest at the edge', () => {
    const shallow = autoScrollStep(AUTO_SCROLL_EDGE_TOP - 10, HEIGHT);
    const deep = autoScrollStep(5, HEIGHT);
    expect(shallow).toBeLessThan(0);
    expect(deep).toBeLessThan(shallow);
    expect(autoScrollStep(0, HEIGHT)).toBe(-AUTO_SCROLL_MAX_STEP);
  });

  it('scrolls down near the bottom, fastest at the edge', () => {
    const shallow = autoScrollStep(HEIGHT - AUTO_SCROLL_EDGE_BOTTOM + 10, HEIGHT);
    const deep = autoScrollStep(HEIGHT - 5, HEIGHT);
    expect(shallow).toBeGreaterThan(0);
    expect(deep).toBeGreaterThan(shallow);
    expect(autoScrollStep(HEIGHT, HEIGHT)).toBe(AUTO_SCROLL_MAX_STEP);
  });

  it('never exceeds the max step past the viewport', () => {
    expect(autoScrollStep(-50, HEIGHT)).toBe(-AUTO_SCROLL_MAX_STEP);
    expect(autoScrollStep(HEIGHT + 50, HEIGHT)).toBe(AUTO_SCROLL_MAX_STEP);
  });
});

describe('startDragAutoScroll', () => {
  let frames: Array<(time: number) => void>;
  let scrollY: number;
  let stop: (() => void) | null;

  const runFrame = () => {
    const pending = frames;
    frames = [];
    pending.forEach((cb) => cb(0));
  };

  beforeEach(() => {
    frames = [];
    scrollY = 1000;
    stop = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      frames = [];
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: HEIGHT });
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
    vi.spyOn(window, 'scrollBy').mockImplementation(((_x: number, y: number) => {
      scrollY = Math.max(0, scrollY + y);
    }) as typeof window.scrollBy);
  });

  afterEach(() => {
    stop?.();
    vi.restoreAllMocks();
  });

  const mouseAt = (y: number) =>
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: y, bubbles: true }));

  const touchAt = (y: number, identifier = 7) => {
    const event = new Event('touchmove', { bubbles: true });
    const touch = { identifier, clientX: 40, clientY: y };
    Object.defineProperty(event, 'touches', { value: [touch] });
    Object.defineProperty(event, 'changedTouches', { value: [touch] });
    document.dispatchEvent(event);
  };

  it('does nothing before the pointer moves', () => {
    stop = startDragAutoScroll(window);
    runFrame();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('does nothing while the pointer is away from the edges', () => {
    stop = startDragAutoScroll(window);
    mouseAt(HEIGHT / 2);
    runFrame();
    runFrame();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('keeps scrolling up every frame while a mouse is held at the top, replaying its position', () => {
    stop = startDragAutoScroll(window);
    mouseAt(10);
    const replays: MouseEvent[] = [];
    const listener = (e: MouseEvent) => replays.push(e);
    document.addEventListener('mousemove', listener);

    runFrame();
    runFrame();

    document.removeEventListener('mousemove', listener);
    expect(window.scrollBy).toHaveBeenCalledTimes(2);
    expect(scrollY).toBeLessThan(1000);
    expect(replays).toHaveLength(2);
    expect(replays[0].clientY).toBe(10);
    expect(replays[0].clientX).toBe(40);
  });

  it('scrolls down with a finger held at the bottom and replays the same touch', () => {
    stop = startDragAutoScroll(window);
    touchAt(HEIGHT - 10);
    const replays: Event[] = [];
    const listener = (e: Event) => replays.push(e);
    document.addEventListener('touchmove', listener);

    runFrame();

    document.removeEventListener('touchmove', listener);
    expect(scrollY).toBeGreaterThan(1000);
    expect(replays).toHaveLength(1);
    const replayed = replays[0] as unknown as { targetTouches: Touch[]; changedTouches: Touch[] };
    expect(replayed.targetTouches[0]).toMatchObject({ identifier: 7, clientY: HEIGHT - 10 });
    expect(replayed.changedTouches[0]).toMatchObject({ identifier: 7, clientY: HEIGHT - 10 });
  });

  it('does not replay when the page cannot scroll any further', () => {
    scrollY = 0;
    stop = startDragAutoScroll(window);
    mouseAt(10);
    const listener = vi.fn();
    document.addEventListener('mousemove', listener);

    runFrame();

    document.removeEventListener('mousemove', listener);
    expect(window.scrollBy).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('a replayed event does not overwrite the tracked pointer', () => {
    stop = startDragAutoScroll(window);
    mouseAt(10);
    runFrame();
    mouseAt(HEIGHT / 2);
    vi.mocked(window.scrollBy).mockClear();
    runFrame();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('when pinch-zoomed, measures the edges from the visible part of the page', () => {
    // Visible: layout-viewport y 300..700. y=320 is near its top; y=40 is above it entirely.
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { offsetTop: 300, height: 400 } });
    try {
      stop = startDragAutoScroll(window);
      mouseAt(500);
      runFrame();
      expect(window.scrollBy).not.toHaveBeenCalled();
      mouseAt(320);
      runFrame();
      expect(scrollY).toBeLessThan(1000);
      const afterTop = scrollY;
      mouseAt(690);
      runFrame();
      expect(scrollY).toBeGreaterThan(afterTop);
    } finally {
      delete (window as { visualViewport?: unknown }).visualViewport;
    }
  });

  it('stops scrolling and listening once stopped', () => {
    stop = startDragAutoScroll(window);
    mouseAt(10);
    stop();
    stop = null;
    runFrame();
    mouseAt(10);
    runFrame();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });
});
