import { describe, expect, it } from 'vitest';

import { parseDebugUrl } from './debugUrl';

describe('parseDebugUrl', () => {
  it('reads the reference and type', () => {
    expect(parseDebugUrl({ ref: 'abc', type: 'job' })).toEqual({ initialRef: 'abc', initialType: 'job' });
  });

  it('takes the first of a repeated key and leaves missing ones undefined', () => {
    expect(parseDebugUrl({ ref: ['a', 'b'] })).toEqual({ initialRef: 'a', initialType: undefined });
    expect(parseDebugUrl({})).toEqual({ initialRef: undefined, initialType: undefined });
  });
});
