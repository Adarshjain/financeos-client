import { describe, expect, it } from 'vitest';

import { initialForm, ratioCopy, requestBody, validateForm } from './corporateActionFormModel';
import { demerger } from './corporateActions.fixtures';

const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };
const hotels = { id: 'i-itch', name: 'ITC Hotels' };
const base = () => ({ ...initialForm({ today: '2026-10-23', instrument: itc }), target: null });

describe('initialForm', () => {
  it('starts on a 1 → 2 split dated today', () => {
    expect(initialForm({ today: '2026-10-23' })).toMatchObject({ instrument: null, type: 'split', exDate: '2026-10-23', ratioFrom: '1', ratioTo: '2', costAllocationPct: '20' });
  });

  it('takes a preselected instrument and kind', () => {
    expect(initialForm({ today: '2026-10-23', instrument: itc, type: 'merger' })).toMatchObject({ instrument: itc, type: 'merger' });
  });

  it('is filled from a saved action', () => {
    expect(initialForm({ today: '2026-10-23', action: demerger })).toMatchObject({
      instrument: { id: 'i-itc', name: 'ITC' },
      type: 'demerger',
      exDate: '2025-01-06',
      ratioFrom: '10',
      ratioTo: '1',
      target: { id: 'i-itch', name: 'ITC Hotels' },
      costAllocationPct: '1.5',
      cashInLieu: '12',
      notes: '',
    });
  });
});

describe('validateForm', () => {
  it('accepts a split', () => {
    expect(validateForm(base())).toEqual({});
  });

  it('asks for an instrument, a date and whole-number ratios', () => {
    const errors = validateForm({ ...base(), instrument: null, exDate: '', ratioFrom: '0', ratioTo: '1.5' });
    expect(Object.keys(errors).sort()).toEqual(['exDate', 'instrument', 'ratioFrom', 'ratioTo']);
  });

  it('asks a demerger for a child and a cost share above 0 and up to 100', () => {
    expect(validateForm({ ...base(), type: 'demerger' }).target).toBe('Child instrument is required.');
    expect(validateForm({ ...base(), type: 'demerger', target: hotels, costAllocationPct: '0' }).costAllocationPct).toBeDefined();
    expect(validateForm({ ...base(), type: 'demerger', target: hotels, costAllocationPct: '101' }).costAllocationPct).toBeDefined();
    expect(validateForm({ ...base(), type: 'demerger', target: hotels, costAllocationPct: '100' })).toEqual({});
  });

  it('asks a merger for an acquirer different from the instrument', () => {
    expect(validateForm({ ...base(), type: 'merger' }).target).toBe('Acquirer instrument is required.');
    expect(validateForm({ ...base(), type: 'merger', target: itc }).target).toBe('Must be different from the instrument.');
    expect(validateForm({ ...base(), type: 'merger', target: hotels })).toEqual({});
  });
});

describe('a bonus', () => {
  it('needs more units after than before, with the reason on After', () => {
    expect(validateForm({ ...base(), type: 'bonus', ratioFrom: '1', ratioTo: '1' }).ratioTo).toMatch(/more than Before/);
    expect(validateForm({ ...base(), type: 'bonus', ratioFrom: '2', ratioTo: '1' }).ratioTo).toMatch(/more than Before/);
    expect(validateForm({ ...base(), type: 'bonus', ratioFrom: '1', ratioTo: '2' })).toEqual({});
  });

  it('is saved as before → after and carries the 1 → 2 hint', () => {
    expect(requestBody({ ...base(), type: 'bonus', ratioFrom: '1', ratioTo: '2' })).toMatchObject({ ratioFrom: 1, ratioTo: 2 });
    expect(ratioCopy('bonus').hint).toBe('For a 1:1 bonus issue, enter 1 → 2.');
    expect(ratioCopy('split').hint).toBeUndefined();
  });
});

describe('a split', () => {
  it('needs different Before and After numbers', () => {
    expect(validateForm({ ...base(), ratioFrom: '2', ratioTo: '2' }).ratioTo).toMatch(/different/);
    expect(validateForm({ ...base(), ratioFrom: '1', ratioTo: '2' })).toEqual({});
  });
});

describe('requestBody', () => {
  it('is the split without child fields', () => {
    expect(requestBody({ ...base(), notes: '  ' })).toEqual({
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-10-23',
      notes: undefined,
      targetInstrumentId: undefined,
      costAllocationPct: undefined,
      fractionalCashInLieu: undefined,
    });
  });

  it('carries the child, cost share and cash-in-lieu (0 when empty) of a demerger', () => {
    expect(requestBody({ ...base(), type: 'demerger', target: hotels, costAllocationPct: '1.5', notes: 'x' })).toMatchObject({
      type: 'demerger',
      targetInstrumentId: 'i-itch',
      costAllocationPct: 1.5,
      fractionalCashInLieu: 0,
      notes: 'x',
    });
  });

  it('leaves out the cost share for a merger', () => {
    expect(requestBody({ ...base(), type: 'merger', target: hotels, cashInLieu: '12.5' })).toMatchObject({
      costAllocationPct: undefined,
      fractionalCashInLieu: 12.5,
    });
  });

  it('is null while the form is invalid', () => {
    expect(requestBody({ ...base(), ratioTo: '' })).toBeNull();
  });
});

describe('ratioCopy', () => {
  it('words the ratio per kind', () => {
    expect(ratioCopy('split')).toMatchObject({ from: 'Before', to: 'After' });
    expect(ratioCopy('demerger').heading).toContain('parent held → child received');
    expect(ratioCopy('merger').heading).toContain('transferor held → acquirer received');
  });
});
