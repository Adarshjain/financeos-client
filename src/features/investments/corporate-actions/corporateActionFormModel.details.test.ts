import { describe, expect, it } from 'vitest';

import { initialForm, requestBody, sourcesStillApply, validateForm } from './corporateActionFormModel';
import { demergerDetails, hotels, multiDetails } from './corporateActionScheme.fixtures';

const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };
const open = (details = demergerDetails(), over: { type?: 'demerger' | 'merger'; childIndex?: number } = {}) =>
  initialForm({ today: '2026-11-12', instrument: itc, type: over.type ?? 'demerger', prefill: { exDate: '2025-01-06', details, childIndex: over.childIndex } });

describe('initialForm from the notices', () => {
  it('fills the child, the ratio and the cost allocation', () => {
    const f = open();
    expect(f.target).toEqual({ id: 'i-itch', name: 'ITC Hotels', symbol: 'ITCHOTELS' });
    expect(f.pendingChild).toBeNull();
    expect([f.ratioFrom, f.ratioTo]).toEqual(['10', '1']);
    expect(f.costAllocationPct).toBe('13.51');
  });
  it('holds a child that is not in the catalog as pending, with no instrument yet', () => {
    const f = open(demergerDetails({ children: [{ ...hotels, instrumentId: null }] }));
    expect(f.target).toBeNull();
    expect(f.pendingChild?.symbol).toBe('ITCHOTELS');
    expect(validateForm(f).target).toBeUndefined();
    expect(requestBody(f)).toBeNull();
  });
  it('keeps the ratio blank when the notices have none, and the default cost without a share', () => {
    const f = open(demergerDetails({ children: [{ ...hotels, ratioFrom: null, ratioTo: null, childCostPct: null }] }));
    expect([f.ratioFrom, f.ratioTo]).toEqual(['', '']);
    expect(f.costAllocationPct).toBe('20');
  });
  it('fills the acquirer and ratio of a merger, with no cost allocation sent', () => {
    const f = open(demergerDetails(), { type: 'merger' });
    expect(f.target?.id).toBe('i-itch');
    expect([f.ratioFrom, f.ratioTo]).toEqual(['10', '1']);
    expect(requestBody(f)).toMatchObject({ type: 'merger', targetInstrumentId: 'i-itch', ratioFrom: 10, ratioTo: 1, costAllocationPct: undefined });
  });
  it('converts each later child to a share of what is left', () => {
    expect(open(multiDetails(), { childIndex: 1 }).costAllocationPct).toBe('11.56');
    expect(open(multiDetails(), { childIndex: 2 }).costAllocationPct).toBe('6.54');
    expect(open(multiDetails(), { childIndex: 2 }).pendingChild?.name).toBe('Gamma Co');
  });
  it('shows a source line only while the prefilled value is untouched', () => {
    const f = open();
    expect(sourcesStillApply(f, f)).toEqual({ target: true, ratio: true, cost: true });
    expect(sourcesStillApply({ ...f, ratioTo: '2', costAllocationPct: '5', target: { id: 'x', name: 'X', symbol: null } }, f)).toEqual({ target: false, ratio: false, cost: false });
  });
});
