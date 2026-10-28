import { describe, expect, it } from 'vitest';

import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Rahul Sharma')).toBe('RS');
    expect(initialsOf('Dad')).toBe('D');
    expect(initialsOf('Goa trip pool')).toBe('GT');
    expect(initialsOf('  priya   nair ')).toBe('PN');
  });
  it('is empty for a blank name', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
  });
});
