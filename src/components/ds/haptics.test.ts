import { afterEach, describe, expect, it, vi } from 'vitest';

import { hapticTick } from './haptics';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hapticTick', () => {
  it('vibrates 10ms when supported', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    hapticTick();
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('does not throw without vibrate', () => {
    vi.stubGlobal('navigator', {});
    expect(() => hapticTick()).not.toThrow();
  });

  it('does not throw when vibrate throws', () => {
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked'); } });
    expect(() => hapticTick()).not.toThrow();
  });
});
