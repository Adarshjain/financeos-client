type Metrics = { height: number; offsetTop: number; scale: number };

/**
 * Installs a controllable stand-in for `window.visualViewport`, which jsdom
 * does not implement. Defaults describe a closed keyboard.
 */
export function installFakeVisualViewport(initial: Partial<Metrics> = {}) {
  const vv = new EventTarget() as EventTarget & Metrics;
  vv.height = initial.height ?? window.innerHeight;
  vv.offsetTop = initial.offsetTop ?? 0;
  vv.scale = initial.scale ?? 1;
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true });

  return {
    vv,
    /** Applies new metrics and fires the event a browser would. */
    set(next: Partial<Metrics>, event: 'resize' | 'scroll' = 'resize') {
      Object.assign(vv, next);
      vv.dispatchEvent(new Event(event));
    },
    uninstall() {
      Object.defineProperty(window, 'visualViewport', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    },
  };
}
