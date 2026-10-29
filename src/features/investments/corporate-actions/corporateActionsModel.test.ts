import { describe, expect, it } from 'vitest';

import { bonus, demerger, previewDemerger, split } from './corporateActions.fixtures';
import {
  CORPORATE_ACTIONS_HREF,
  corporateActionListRow,
  corporateActionsQuery,
  corporateActionsUrl,
  parseCorporateActionsUrl,
  previewLines,
} from './corporateActionsModel';

describe('corporate actions URL state', () => {
  it('defaults to newest, all types, page 0 and 25 a page', () => {
    expect(parseCorporateActionsUrl({})).toEqual({ q: '', type: '', sort: 'newest', page: 0, size: 25 });
  });

  it('ignores values it does not know', () => {
    expect(parseCorporateActionsUrl({ type: 'rights', sort: 'random', page: '-3', size: '7' })).toEqual({
      q: '',
      type: '',
      sort: 'newest',
      page: 0,
      size: 25,
    });
  });

  it('keeps the search (trimmed), kind, sort, page and size', () => {
    const state = parseCorporateActionsUrl({ q: ' infy ', type: 'merger', sort: 'name', page: '3', size: '50' });
    expect(state).toEqual({ q: 'infy', type: 'merger', sort: 'name', page: 2, size: 50 });
  });

  it('leaves defaults out of the address and writes the rest', () => {
    expect(corporateActionsUrl(parseCorporateActionsUrl({}))).toBe(CORPORATE_ACTIONS_HREF);
    expect(corporateActionsUrl({ q: 'itc', type: 'split', sort: 'oldest', page: 1, size: 50 })).toBe(
      `${CORPORATE_ACTIONS_HREF}?q=itc&type=split&sort=oldest&page=2&size=50`,
    );
  });

  it('asks the server for the same state', () => {
    expect(corporateActionsQuery({ q: '', type: 'bonus', sort: 'newest', page: 3, size: 25 })).toEqual({
      type: 'bonus',
      search: undefined,
      sort: 'newest',
      page: 3,
      size: 25,
    });
  });
});

describe('corporateActionListRow', () => {
  it('shows a bonus with its symbol, note, ratio and quantities', () => {
    const row = corporateActionListRow(bonus);
    expect(row).toMatchObject({
      date: '10 Jun 25',
      title: 'INFY · Infosys',
      detail: 'Note: record date 11 Jun 25',
      typeLabel: 'Bonus',
      ratio: '1 : 1',
      effect: '30 → 60',
      cost: 'cost ₹1,420 → ₹710',
      phoneLine: 'ex 10 Jun 25 · 1:1 · 30 → 60 shares · cost ₹1,420 → ₹710',
    });
  });

  it('has no detail line for a split without notes', () => {
    expect(corporateActionListRow(split)).toMatchObject({ detail: '', typeLabel: 'Split', ratio: '1 : 2', effect: '100 → 200' });
  });

  it('names the child, its cost share and the cash-in-lieu of a demerger', () => {
    expect(corporateActionListRow(demerger).detail).toBe('Child ITC Hotels · 1.5% cost · cash-in-lieu ₹12');
  });

  it('names the acquirer of a merger', () => {
    const merger = { ...demerger, type: 'merger' as const, costAllocationPct: null, fractionalCashInLieu: 0, targetInstrumentSymbol: 'HDFCBANK', targetInstrumentName: 'HDFC Bank' };
    expect(corporateActionListRow(merger).detail).toBe('Merged into HDFCBANK · HDFC Bank');
  });

  it('shows a fractional cost per share with paise and leaves the cost out when the server has none', () => {
    expect(corporateActionListRow(demerger).cost).toBe('cost ₹410 → ₹403.85');
    expect(corporateActionListRow({ ...bonus, costPerUnitBefore: null, costPerUnitAfter: null }).cost).toBe('');
  });

  it('leaves the effect out when the server has no quantities', () => {
    const row = corporateActionListRow({ ...bonus, quantityBefore: null, quantityAfter: null });
    expect(row.effect).toBe('');
    expect(row.phoneLine).toBe('ex 10 Jun 25 · 1:1 · cost ₹1,420 → ₹710');
  });

  it('uses just the name when the symbol is the name or missing', () => {
    expect(corporateActionListRow({ ...bonus, instrumentSymbol: null }).title).toBe('Infosys');
    expect(corporateActionListRow({ ...bonus, instrumentSymbol: 'Infosys' }).title).toBe('Infosys');
  });
});

describe('previewLines', () => {
  it('shows the parent before and after, and the child it creates', () => {
    expect(previewLines(previewDemerger, 'ITC', 'ITC Hotels')).toEqual([
      { key: 'b1-parent', label: 'ITC', text: '100 shares · cost ₹41,000 → ₹40,385' },
      { key: 'b1-child', label: 'ITC Hotels', text: '+10 shares · cost ₹615' },
    ]);
  });

  it('shows the quantity change of a split and names the broker when there are several', () => {
    const base = previewDemerger.holdings[0];
    const lines = previewLines(
      {
        holdings: [
          { ...base, childInstrumentId: null, childQuantity: null, childCost: null, quantityAfter: 200, openCostAfter: 41000 },
          { ...base, brokerAccountId: 'b2', brokerAccountName: 'Groww', childInstrumentId: null, childQuantity: null, childCost: null, quantityBefore: 10, quantityAfter: 20 },
        ],
      },
      'ITC',
      '',
    );
    expect(lines.map((l) => [l.label, l.text])).toEqual([
      ['ITC (Zerodha)', '100 → 200 shares · cost ₹41,000 → ₹41,000'],
      ['ITC (Groww)', '10 → 20 shares · cost ₹41,000 → ₹40,385'],
    ]);
  });

  it('adds the realised cash-in-lieu gain when there is one', () => {
    const lines = previewLines({ holdings: [{ ...previewDemerger.holdings[0], fractionalRealized: 45 }] }, 'ITC', 'ITC Hotels');
    expect(lines.at(-1)).toEqual({ key: 'b1-fraction', label: 'Cash-in-lieu gain', text: '₹45' });
  });

  it('is empty when the user holds none of it', () => {
    expect(previewLines({ holdings: [] }, 'ITC', '')).toEqual([]);
  });
});
