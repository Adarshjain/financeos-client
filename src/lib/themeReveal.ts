import { flushSync } from 'react-dom';

export interface RevealOrigin {
  x: number;
  y: number;
}

export const THEME_VT_CLASS = 'ds-theme-vt';
const DURATION_MS = 500;
const EASING = 'cubic-bezier(.2, .8, .2, 1)';

/** The newest transition; an older one finishing must not drop the class while this one still runs. */
let latest: ViewTransition | null = null;

/** The centre of an element, the point a theme reveal grows from. */
export function originOf(el: Element | null): RevealOrigin | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Runs `apply` (which changes the theme) inside a View Transition and grows the new theme over the old as a
 * circle from `origin`. Browsers without View Transitions, and people who prefer reduced motion, just get
 * `apply`. The `ds-theme-vt` class on <html> (ds.css) keeps the page and row view transitions out of it.
 */
export function revealTheme(apply: () => void, origin?: RevealOrigin): void {
  const doc = document;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    apply();
    return;
  }
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = doc.documentElement;
  root.classList.add(THEME_VT_CLASS);
  const transition = doc.startViewTransition(() => {
    flushSync(apply);
  });
  latest = transition;
  const done = () => {
    if (latest === transition) root.classList.remove(THEME_VT_CLASS);
  };
  transition.finished.then(done, done);
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION_MS, easing: EASING, pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(done);
}
