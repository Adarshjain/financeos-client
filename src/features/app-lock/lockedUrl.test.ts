import { describe, expect, it } from 'vitest';

import { parseLockedUrl } from './lockedUrl';

describe('parseLockedUrl', () => {
  it('goes back to a local path', () => {
    expect(parseLockedUrl({ from: '/accounts?x=1' })).toEqual({ from: '/accounts?x=1' });
  });

  it('goes Home for no path, an outside address or protocol-relative path', () => {
    expect(parseLockedUrl({})).toEqual({ from: '/dashboard' });
    expect(parseLockedUrl({ from: 'https://evil.test' })).toEqual({ from: '/dashboard' });
    expect(parseLockedUrl({ from: '//evil.test' })).toEqual({ from: '/dashboard' });
  });

  it('ignores a repeated from key', () => {
    expect(parseLockedUrl({ from: ['/a', '/b'] })).toEqual({ from: '/dashboard' });
  });

  it('never loops back to the lock page', () => {
    expect(parseLockedUrl({ from: '/locked' })).toEqual({ from: '/dashboard' });
  });
});
