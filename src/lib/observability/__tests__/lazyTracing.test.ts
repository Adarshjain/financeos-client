import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isTracingLoaded, resetLazyTracingForTests, scheduleTracingLoad } from '../lazyTracing';

describe('scheduleTracingLoad', () => {
  beforeEach(() => {
    resetLazyTracingForTests();
    vi.restoreAllMocks();
  });

  it('imports nothing before the page has loaded, and adds the instrumentation after', async () => {
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const add = vi.fn();
    const instance = { name: 'tracing' };
    const Tracing = vi.fn(function () {
      return instance;
    });
    const loader = vi.fn(() => Promise.resolve({ TracingInstrumentation: Tracing as never }));
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback = (cb) => cb();

    scheduleTracingLoad({ instrumentations: { add } } as never, loader);
    expect(loader).not.toHaveBeenCalled();
    expect(isTracingLoaded()).toBe(false);

    window.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith(instance));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(isTracingLoaded()).toBe(true);
  });
});
