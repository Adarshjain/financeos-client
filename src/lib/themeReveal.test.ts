import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { originOf, revealTheme, THEME_VT_CLASS } from './themeReveal';

let reduced = false;
let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  animate = vi.fn();
  document.documentElement.animate = animate as unknown as typeof document.documentElement.animate;
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  document.documentElement.classList.remove(THEME_VT_CLASS);
});

function stubTransition() {
  let finish!: () => void;
  const finished = new Promise<void>((r) => (finish = r));
  const start = vi.fn((cb: () => void) => {
    cb();
    return { ready: Promise.resolve(), finished };
  });
  (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
  return { start, finish };
}

describe('revealTheme', () => {
  it('applies the change directly when View Transitions are unsupported', () => {
    const apply = vi.fn();
    revealTheme(apply, { x: 10, y: 10 });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });

  it('applies the change directly for reduced motion', () => {
    const { start } = stubTransition();
    reduced = true;
    const apply = vi.fn();
    revealTheme(apply, { x: 10, y: 10 });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it('changes the theme inside a view transition and grows a circle from the origin to the far corner', async () => {
    const { start, finish } = stubTransition();
    const apply = vi.fn();
    revealTheme(apply, { x: 100, y: 200 });
    expect(start).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains(THEME_VT_CLASS)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes, options] = animate.mock.calls[0];
    const radius = Math.hypot(900, 600);
    expect(keyframes.clipPath).toEqual(['circle(0px at 100px 200px)', `circle(${radius}px at 100px 200px)`]);
    expect(options).toMatchObject({ duration: 500, pseudoElement: '::view-transition-new(root)' });
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.classList.contains(THEME_VT_CLASS)).toBe(false);
  });

  it('keeps the class until the latest of two quick transitions has finished', async () => {
    const finishers: Array<() => void> = [];
    (document as unknown as { startViewTransition: unknown }).startViewTransition = vi.fn((cb: () => void) => {
      cb();
      let finish!: () => void;
      const finished = new Promise<void>((r) => (finish = r));
      finishers.push(finish);
      return { ready: Promise.resolve(), finished };
    });
    revealTheme(vi.fn(), { x: 1, y: 1 });
    revealTheme(vi.fn(), { x: 2, y: 2 });
    finishers[0]();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.classList.contains(THEME_VT_CLASS)).toBe(true);
    finishers[1]();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.classList.contains(THEME_VT_CLASS)).toBe(false);
  });

  it('grows from the viewport centre without an origin', async () => {
    stubTransition();
    revealTheme(vi.fn());
    await Promise.resolve();
    await Promise.resolve();
    expect(animate.mock.calls[0][0].clipPath[0]).toBe('circle(0px at 500px 400px)');
  });
});

describe('originOf', () => {
  it('is the centre of the element, or undefined without one', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 40 }) as DOMRect;
    expect(originOf(el)).toEqual({ x: 60, y: 40 });
    expect(originOf(null)).toBeUndefined();
  });
});
