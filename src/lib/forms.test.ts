import { describe, expect, it } from 'vitest';

import { optionalDecimal, optionalInteger, optionalString } from './forms';

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

// These guard the money-corruption bug: `parseInt` truncated paise, and a blank
// numeric input became NaN which JSON.stringify emits as `null`, so clearing a
// field silently posted null for it.
describe('optionalDecimal', () => {
  it('keeps the fractional part — parseInt dropped it', () => {
    expect(optionalDecimal(form({ amount: '12345.67' }), 'amount')).toBe(12345.67);
  });

  it('returns undefined for a blank field, never NaN', () => {
    const value = optionalDecimal(form({ amount: '' }), 'amount');
    expect(value).toBeUndefined();
    // The precise failure mode of the old code: NaN survived `?? undefined`
    // because ?? only short-circuits null/undefined, then serialised as null.
    expect(JSON.stringify({ amount: value })).toBe('{}');
  });

  it('returns undefined for whitespace only', () => {
    expect(optionalDecimal(form({ amount: '   ' }), 'amount')).toBeUndefined();
  });

  it('returns undefined for an absent key', () => {
    expect(optionalDecimal(form({}), 'amount')).toBeUndefined();
  });

  it('rejects partial garbage outright rather than salvaging a prefix', () => {
    // parseFloat('12abc') would have returned 12.
    expect(optionalDecimal(form({ amount: '12abc' }), 'amount')).toBeUndefined();
  });

  it('preserves zero, which is a real value', () => {
    expect(optionalDecimal(form({ amount: '0' }), 'amount')).toBe(0);
  });

  it('handles negatives', () => {
    expect(optionalDecimal(form({ amount: '-50.5' }), 'amount')).toBe(-50.5);
  });
});

describe('optionalInteger', () => {
  it('truncates toward zero', () => {
    expect(optionalInteger(form({ day: '15.9' }), 'day')).toBe(15);
  });

  it('returns undefined for blank', () => {
    expect(optionalInteger(form({ day: '' }), 'day')).toBeUndefined();
  });

  it('preserves zero', () => {
    expect(optionalInteger(form({ day: '0' }), 'day')).toBe(0);
  });
});

describe('optionalString', () => {
  it('trims surrounding whitespace', () => {
    expect(optionalString(form({ last4: '  1234  ' }), 'last4')).toBe('1234');
  });

  it('collapses blank to undefined so the key is omitted', () => {
    expect(optionalString(form({ last4: '' }), 'last4')).toBeUndefined();
    expect(optionalString(form({ last4: '   ' }), 'last4')).toBeUndefined();
  });

  it('returns undefined for an absent key', () => {
    expect(optionalString(form({}), 'last4')).toBeUndefined();
  });

  it('returns undefined for a File value rather than stringifying it', () => {
    const fd = new FormData();
    fd.set('upload', new File(['x'], 'statement.pdf'));
    expect(optionalString(fd, 'upload')).toBeUndefined();
  });
});
