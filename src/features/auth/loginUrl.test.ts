import { describe, expect, it } from 'vitest';

import { parseLoginUrl } from './loginUrl';

describe('parseLoginUrl', () => {
  it('sends a signed-in visitor back to a local path', () => {
    expect(parseLoginUrl({ from: '/accounts' })).toEqual({ destination: '/accounts' });
  });

  it('goes Home for no path or an outside address', () => {
    expect(parseLoginUrl({})).toEqual({ destination: '/dashboard' });
    expect(parseLoginUrl({ from: 'https://evil.test' })).toEqual({ destination: '/dashboard' });
  });
});
