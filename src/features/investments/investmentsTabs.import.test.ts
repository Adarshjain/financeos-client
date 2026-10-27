import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, INVESTMENTS_IMPORT_HREF, isHoldingDetailPath, isImportPath } from './investmentsTabs';

describe('the Import tradebook path', () => {
  it('is its own page under /investments', () => {
    expect(INVESTMENTS_IMPORT_HREF).toBe('/investments/import');
  });

  it('is recognised, with or without a trailing slash, and nothing else is', () => {
    expect(isImportPath('/investments/import')).toBe(true);
    expect(isImportPath('/investments/import/')).toBe(true);
    expect(isImportPath('/investments/tradebook')).toBe(false);
    expect(isImportPath('/investments/i1')).toBe(false);
    expect(isImportPath('/transactions/import')).toBe(false);
    expect(isImportPath(null)).toBe(false);
  });

  it('is not taken for a holding', () => {
    expect(isHoldingDetailPath('/investments/import')).toBe(false);
  });

  it('belongs to no tab', () => {
    expect(activeInvestmentsTab('/investments/import')).toBe('holdings');
  });
});
