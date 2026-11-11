import { describe, expect, it } from 'vitest';

import { hasRatio, initialForm, requestBody, validateForm } from './corporateActionFormModel';
import { bonus } from './corporateActions.fixtures';
import { corporateActionListRow, KIND_LABELS, KINDS } from './corporateActionsModel';

const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };
const delisted = () => ({ ...initialForm({ today: '2026-10-23', instrument: itc, type: 'delisted' }), ratioFrom: '', ratioTo: '' });

describe('a delisting', () => {
  it('is a kind with the label Delisted and needs no ratio', () => {
    expect(KINDS).toContain('delisted');
    expect(KIND_LABELS.delisted).toBe('Delisted');
    expect(hasRatio('delisted')).toBe(false);
    expect(hasRatio('bonus')).toBe(true);
  });

  it('is valid with just the instrument and the date', () => {
    expect(validateForm(delisted())).toEqual({});
    expect(validateForm({ ...delisted(), instrument: null })).toEqual({ instrument: 'Select an instrument.' });
    expect(validateForm({ ...delisted(), exDate: '' })).toEqual({ exDate: 'Ex-date is required.' });
  });

  it('sends 1 → 1 with no target and no cost split', () => {
    expect(requestBody(delisted())).toEqual({
      type: 'delisted',
      ratioFrom: 1,
      ratioTo: 1,
      exDate: '2026-10-23',
      notes: undefined,
      targetInstrumentId: undefined,
      costAllocationPct: undefined,
      fractionalCashInLieu: undefined,
    });
  });

  it('shows no ratio in the list', () => {
    const row = corporateActionListRow({ ...bonus, type: 'delisted', ratioFrom: 1, ratioTo: 1 });
    expect(row.typeLabel).toBe('Delisted');
    expect(row.ratio).toBe('—');
    expect(row.phoneLine).not.toContain('1:1');
  });
});

describe('initialForm with a detected suggestion', () => {
  it('starts on the detected date and ratio', () => {
    expect(initialForm({ today: '2026-10-23', instrument: itc, type: 'bonus', prefill: { exDate: '2025-01-15', ratioFrom: 1, ratioTo: 2 } })).toMatchObject({
      type: 'bonus',
      exDate: '2025-01-15',
      ratioFrom: '1',
      ratioTo: '2',
    });
  });

  it('keeps the defaults for what the suggestion does not know', () => {
    expect(initialForm({ today: '2026-10-23', prefill: { exDate: null, ratioFrom: null, ratioTo: null } })).toMatchObject({ exDate: '2026-10-23', ratioFrom: '1', ratioTo: '2' });
  });
});
