import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { bankById,BANKS } from './banks';
import { SPRITE_IDS } from './bankSprite.generated';

describe('banks', () => {
  it('lists the 19 banks, ids unique, in alphabetical order of id', () => {
    expect(BANKS).toHaveLength(19);
    expect(new Set(BANKS.map((b) => b.id)).size).toBe(19);
    expect(BANKS.map((b) => b.id)).toEqual([...BANKS.map((b) => b.id)].sort());
  });

  it('has a sprite cell for every bank, one per bank, and the sprite file exists', () => {
    expect(SPRITE_IDS).toHaveLength(BANKS.length);
    for (const b of BANKS) {
      expect(SPRITE_IDS[b.spriteIndex], b.id).toBe(b.id);
    }
    expect(existsSync(join(process.cwd(), 'public', 'banks', 'sprite.png'))).toBe(true);
  });

  it('finds a bank by id', () => {
    expect(bankById('hdfc')?.name).toBe('HDFC Bank');
    expect(bankById('nope')).toBeUndefined();
    expect(bankById(null)).toBeUndefined();
  });
});
