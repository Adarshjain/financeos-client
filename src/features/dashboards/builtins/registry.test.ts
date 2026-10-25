import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

import { CARDS_SPENDING_BUILTINS } from './group.cardsSpending';
import { INVESTMENTS_LOANS_BUILTINS } from './group.investmentsLoans';
import { BUILTIN_REGISTRY, builtinHasParamsEditor, builtinParamsEditor, builtinPieces } from './registry';

describe('the Dinero built-in registry', () => {
  it('merges both group maps, keyed by builtin key', () => {
    expect(Object.keys(BUILTIN_REGISTRY).sort()).toEqual([...Object.keys(CARDS_SPENDING_BUILTINS), ...Object.keys(INVESTMENTS_LOANS_BUILTINS)].sort());
    expect(Object.keys(BUILTIN_REGISTRY)).toHaveLength(18);
    for (const key of Object.keys(CARDS_SPENDING_BUILTINS)) expect(BUILTIN_REGISTRY[key]).toBe(CARDS_SPENDING_BUILTINS[key]);
    for (const key of Object.keys(INVESTMENTS_LOANS_BUILTINS)) expect(BUILTIN_REGISTRY[key]).toBe(INVESTMENTS_LOANS_BUILTINS[key]);
  });

  it('every built-in has a loading skeleton, and template views are keyed by builtin key', () => {
    for (const [key, entry] of Object.entries(BUILTIN_REGISTRY)) expect(entry.Skeleton, key).toBeTypeOf('function');
    expect(BUILTIN_REGISTRY.net_worth.View).toBeTypeOf('function');
    expect(BUILTIN_REGISTRY.allocation.View).toBeTypeOf('function');
    expect(BUILTIN_REGISTRY.shortcuts.Body).toBeTypeOf('function');
  });

  it('looks up a key, and knows nothing for an unknown or inherited one', () => {
    expect(builtinPieces('upcoming')).toBe(BUILTIN_REGISTRY.upcoming);
    expect(builtinPieces('nope')).toBeNull();
    expect(builtinPieces('toString')).toBeNull();
    expect(builtinPieces(null)).toBeNull();
  });

  it('only the shortcuts list has a params editor of its own', () => {
    expect(builtinHasParamsEditor('shortcuts')).toBe(true);
    expect(builtinParamsEditor('shortcuts')).toBeTypeOf('function');
    expect(builtinHasParamsEditor('top_movers')).toBe(false);
    expect(builtinParamsEditor(undefined)).toBeNull();
  });
});
