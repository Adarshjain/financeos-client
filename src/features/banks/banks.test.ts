import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { bankById,BANKS } from './banks';

describe('banks', () => {
  it('lists the 58 banks, ids unique', () => {
    expect(BANKS).toHaveLength(58);
    expect(new Set(BANKS.map((b) => b.id)).size).toBe(58);
  });

  it('has a logo file for every bank', () => {
    for (const b of BANKS) {
      expect(b.logo).toBe(`/banks/${b.id}.png`);
      expect(existsSync(join(process.cwd(), 'public', b.logo)), b.id).toBe(true);
    }
  });

  it('finds a bank by id', () => {
    expect(bankById('hdfc')?.name).toBe('HDFC Bank');
    expect(bankById('nope')).toBeUndefined();
    expect(bankById(null)).toBeUndefined();
  });
});
