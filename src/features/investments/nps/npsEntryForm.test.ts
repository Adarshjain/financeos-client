import { describe, expect, it } from 'vitest';

import { emptyEntryForm, entryRequest, tierTwoRows, unitsRows, unitsText } from './npsEntryForm';
import type { NpsScheme } from './npsModel';

const sch = (schemeCode: string, nav: number | null, extra: Partial<NpsScheme> = {}): NpsScheme => ({ schemeCode, instrumentId: schemeCode, name: schemeCode, assetClass: 'E', nav, navDate: '2026-11-04', variant: 'DIRECT', tier: 'I', pfmCode: 'P', ...extra });
const schemes = [sch('E', 50), sch('G', 25, { assetClass: 'G' })];
const alloc = [{ schemeCode: 'E', percent: 80 }, { schemeCode: 'G', percent: 20 }];
const form = (patch = {}) => ({ ...emptyEntryForm('a1', '2026-11-05'), amount: '5000', ...patch });

describe('entryRequest', () => {
  it('sends no lines for an untouched contribution, so the server estimates', () => {
    const r = entryRequest(form(), unitsRows(form(), alloc, schemes), schemes);
    expect(r).toEqual({ body: { accountId: 'a1', type: 'CONTRIBUTION', tier: 'I', postedDate: '2026-11-05', note: null, contributor: 'SELF', amount: 5000 } });
  });
  it('sends no lines for an untouched opening balance, and the units once edited', () => {
    const o = form({ type: 'OPENING' });
    expect(entryRequest(o, unitsRows(o, alloc, schemes), schemes)).toEqual({ body: { accountId: 'a1', type: 'OPENING', tier: 'I', postedDate: '2026-11-05', note: null, amount: 5000 } });
    const e = form({ type: 'OPENING', units: { E: '79' } });
    const r = entryRequest(e, unitsRows(e, alloc, schemes), schemes);
    expect('body' in r && r.body.lines).toHaveLength(2);
  });
  it('sends the units once one was edited', () => {
    const f = form({ units: { E: '79' } });
    const r = entryRequest(f, unitsRows(f, alloc, schemes), schemes);
    expect('body' in r && r.body.lines).toEqual([{ schemeCode: 'E', units: 79, nav: 50 }, { schemeCode: 'G', units: 40, nav: 25 }]);
  });
  it('sends charges as a negative amount with negative units', () => {
    const f = form({ type: 'CHARGE', amount: '75' });
    const r = entryRequest(f, unitsRows(f, alloc, schemes), schemes);
    expect('body' in r && r.body.amount).toBe(-75);
    expect('body' in r && r.body.lines?.[0].units).toBe(-1.2);
  });
  it('asks for an amount, and for units on a switch', () => {
    expect(entryRequest(form({ amount: '' }), [], schemes)).toEqual({ error: 'Enter an amount above zero.' });
    const sw = form({ type: 'SWITCH', amount: '' });
    expect(entryRequest(sw, unitsRows(sw, alloc, schemes), schemes)).toEqual({ error: 'Enter the units of at least one scheme.' });
    const typed = { ...sw, units: { E: '-10', G: '20' } };
    const r = entryRequest(typed, unitsRows(typed, alloc, schemes), schemes);
    expect('body' in r && r.body.lines).toHaveLength(2);
  });
  it('shows the estimate in the units field until the user types', () => {
    const f = form();
    const [row] = unitsRows(f, alloc, schemes);
    expect(unitsText(row, {})).toBe('80');
    expect(unitsText(row, { E: '81' })).toBe('81');
  });
});

describe('tierTwoRows', () => {
  it('maps a Tier I allocation onto the same fund and plan in Tier II', () => {
    const all = [...schemes, sch('E-II', 40, { tier: 'II' }), sch('G-II', 20, { tier: 'II', assetClass: 'G' })];
    expect(tierTwoRows(alloc, all, 'P', 'DIRECT')).toEqual([{ schemeCode: 'E-II', percent: 80 }, { schemeCode: 'G-II', percent: 20 }]);
    expect(tierTwoRows(alloc, schemes, 'P', 'DIRECT')).toBeNull();
  });
});
