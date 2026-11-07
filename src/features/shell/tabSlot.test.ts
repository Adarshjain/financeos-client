import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TAB_SLOT, parseTabSlot, TAB_SLOT_COOKIE } from './tabSlotName';
import { saveTabSlot } from './tabSlotSave';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (jar.value === undefined ? undefined : { name, value: jar.value }) }),
}));

describe('parseTabSlot', () => {
  it('keeps the four slots', () => {
    for (const slot of ['accounts', 'lending', 'investments', 'upcoming']) expect(parseTabSlot(slot)).toBe(slot);
  });

  it('falls back to Accounts for missing and unknown values', () => {
    expect(DEFAULT_TAB_SLOT).toBe('accounts');
    for (const bad of [undefined, null, '', 'Lending', 'loans', 'home', '__proto__']) {
      expect(parseTabSlot(bad)).toBe('accounts');
    }
  });
});

describe('readTabSlot (server)', () => {
  beforeEach(() => {
    jar.value = undefined;
  });

  it('reads the cookie, Accounts when missing or unknown', async () => {
    const { readTabSlot } = await import('./tabSlotCookie');
    expect(await readTabSlot()).toBe('accounts');
    jar.value = 'upcoming';
    expect(await readTabSlot()).toBe('upcoming');
    jar.value = 'nope';
    expect(await readTabSlot()).toBe('accounts');
  });
});

describe('saveTabSlot (client)', () => {
  it('writes a one-year lax cookie at the root', () => {
    const set = vi.spyOn(document, 'cookie', 'set');
    saveTabSlot('lending');
    expect(set).toHaveBeenCalledWith(`${TAB_SLOT_COOKIE}=lending; path=/; max-age=31536000; samesite=lax`);
    set.mockRestore();
  });
});
