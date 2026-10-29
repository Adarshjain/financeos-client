import { describe, expect, it } from 'vitest';

import { first } from './searchParams';

describe('first', () => {
  it('returns a single value as is', () => {
    expect(first('a')).toBe('a');
  });

  it('returns the first of a repeated key', () => {
    expect(first(['a', 'b'])).toBe('a');
  });

  it('returns undefined for a missing or empty list', () => {
    expect(first(undefined)).toBeUndefined();
    expect(first([])).toBeUndefined();
  });
});
