import { describe, expect, it } from 'vitest';

import {
  assetClassSelection,
  AUTO_ASSET_CLASS,
  describeOverriddenFields,
  identifierClearError,
  INSTRUMENT_FIELD_LIMITS,
  instrumentFormErrors,
  isOverridden,
} from '@/app/(protected)/investments/instrument-form/instrumentEdit';
import { ApiError } from '@/lib/api/client';
import type { Instrument } from '@/lib/types';

const base: Instrument = { id: 'i1', type: 'stock', name: 'Acme', currency: 'INR' };

function apiError(status: number, body: { code?: string; message: string; details?: Record<string, string> | null }) {
  return new ApiError(status, { code: body.code ?? 'VALIDATION_ERROR', message: body.message, details: body.details });
}

describe('INSTRUMENT_FIELD_LIMITS', () => {
  it('mirrors the server InstrumentRequest @Size limits', () => {
    expect(INSTRUMENT_FIELD_LIMITS).toEqual({
      name: 255,
      symbol: 50,
      exchange: 20,
      isin: 50,
      amfiCode: 50,
      yahooSymbol: 50,
      currency: 10,
    });
  });
});

describe('describeOverriddenFields', () => {
  it('is empty for no fields (null, undefined or [])', () => {
    expect(describeOverriddenFields(null)).toBe('');
    expect(describeOverriddenFields(undefined)).toBe('');
    expect(describeOverriddenFields([])).toBe('');
  });

  it('names a single field in words', () => {
    expect(describeOverriddenFields(['assetClass'])).toBe('asset class');
  });

  it('joins two with "and" and more with commas then "and"', () => {
    expect(describeOverriddenFields(['name', 'symbol'])).toBe('name and symbol');
    expect(describeOverriddenFields(['name', 'exchange', 'currency', 'type'])).toBe(
      'name, exchange, currency and type'
    );
  });

  it('passes an unknown field name through', () => {
    expect(describeOverriddenFields(['name', 'somethingNew'])).toBe('name and somethingNew');
  });
});

describe('isOverridden', () => {
  it('is false without the flag or fields', () => {
    expect(isOverridden(base)).toBe(false);
    expect(isOverridden({ ...base, overridden: false, overriddenFields: [] })).toBe(false);
  });

  it('is true from the flag or from a non-empty field list', () => {
    expect(isOverridden({ ...base, overridden: true })).toBe(true);
    expect(isOverridden({ ...base, overriddenFields: ['name'] })).toBe(true);
  });
});

describe('assetClassSelection', () => {
  it('is Auto when the asset class is not the user\'s override (even with a catalog class)', () => {
    expect(assetClassSelection({ ...base, assetClass: 'EQUITY', assetClassSource: 'AMFI' })).toBe(AUTO_ASSET_CLASS);
    expect(assetClassSelection({ ...base, assetClass: 'GOLD', overriddenFields: ['name'] })).toBe(AUTO_ASSET_CLASS);
  });

  it('is the pinned class when assetClass is among the overridden fields', () => {
    expect(assetClassSelection({ ...base, assetClass: 'DEBT', overriddenFields: ['assetClass'] })).toBe('DEBT');
  });

  it('falls back to Auto when overridden but the class is missing', () => {
    expect(assetClassSelection({ ...base, assetClass: null, overriddenFields: ['assetClass'] })).toBe(AUTO_ASSET_CLASS);
  });
});

describe('instrumentFormErrors', () => {
  it('is null for anything but a 400 ApiError (caller toasts)', () => {
    expect(instrumentFormErrors(new Error('boom'))).toBeNull();
    expect(instrumentFormErrors(apiError(500, { message: 'down' }))).toBeNull();
    expect(instrumentFormErrors(apiError(404, { message: 'missing' }))).toBeNull();
  });

  it('turns a plain 400 (repoint refusal) into a form message', () => {
    const msg = 'Acme is a shared catalog instrument (ISIN X); its price feed can\'t be changed for one account.';
    expect(instrumentFormErrors(apiError(400, { code: 'VALIDATION_ERROR', message: msg }))).toEqual({
      fields: {},
      form: msg,
    });
  });

  it('maps bean-validation details onto the form fields', () => {
    const res = instrumentFormErrors(
      apiError(400, {
        message: 'Validation failed',
        details: { name: 'Name is at most 255 characters', exchange: 'Exchange is at most 20 characters' },
      })
    );
    expect(res).toEqual({
      fields: { name: 'Name is at most 255 characters', exchange: 'Exchange is at most 20 characters' },
      form: null,
    });
  });

  it('keeps a detail for a non-form key as the form message', () => {
    expect(
      instrumentFormErrors(apiError(400, { message: 'Validation failed', details: { type: 'Instrument type is required' } }))
    ).toEqual({ fields: {}, form: 'Instrument type is required' });
    expect(
      instrumentFormErrors(
        apiError(400, { message: 'Validation failed', details: { isin: 'ISIN is at most 50 characters', type: 'bad' } })
      )
    ).toEqual({ fields: { isin: 'ISIN is at most 50 characters' }, form: 'bad' });
  });
});

describe('identifierClearError', () => {
  const orig = { isin: 'INE000A01011', amfiCode: null, yahooSymbol: 'ACME.NS' };
  const vals = (v: Partial<Record<'isin' | 'amfiCode' | 'yahooSymbol', string>>) => ({
    isin: 'INE000A01011',
    amfiCode: '',
    yahooSymbol: 'ACME.NS',
    ...v,
  });

  it('is null when no identifier changed', () => {
    expect(identifierClearError(orig, vals({}))).toBeNull();
  });

  it('ignores case and surrounding spaces (the server compares the same way)', () => {
    expect(identifierClearError(orig, vals({ isin: '  ine000a01011 ', yahooSymbol: '' }))).toEqual(
      expect.objectContaining({ field: 'yahooSymbol' })
    );
    expect(identifierClearError(orig, vals({ yahooSymbol: 'acme.ns' }))).toBeNull();
  });

  it('is null when only one identifier changes to a new value (e.g. only the Yahoo symbol)', () => {
    expect(identifierClearError(orig, vals({ yahooSymbol: 'ACME.BO' }))).toBeNull();
  });

  it('is null when one is cleared but another gets a new value', () => {
    expect(identifierClearError(orig, vals({ isin: '', amfiCode: '120503' }))).toBeNull();
  });

  it('flags the cleared field when clearing without any new identifier', () => {
    const err = identifierClearError(orig, vals({ yahooSymbol: '   ' }));
    expect(err?.field).toBe('yahooSymbol');
    expect(err?.message).toMatch(/Yahoo symbol can't be cleared/);
    expect(err?.message).toMatch(/manual price/);
  });

  it('flags the first cleared field when all are cleared', () => {
    expect(identifierClearError(orig, vals({ isin: '', yahooSymbol: '' }))?.field).toBe('isin');
  });

  it('is null when a field that was already empty stays empty', () => {
    expect(identifierClearError({ isin: null, amfiCode: null, yahooSymbol: null }, vals({ isin: '', yahooSymbol: '' }))).toBeNull();
  });
});
