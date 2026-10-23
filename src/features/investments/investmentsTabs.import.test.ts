import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, INVESTMENTS_IMPORT_HREF, isHoldingDetailPath, isImportPath } from './investmentsTabs';

describe('the Import tradebook path', () => {
  it('is its own page under /ds/investments', () => {
    expect(INVESTMENTS_IMPORT_HREF).toBe('/ds/investments/import');
  });

  it('is recognised, with or without a trailing slash, and nothing else is', () => {
    expect(isImportPath('/ds/investments/import')).toBe(true);
    expect(isImportPath('/ds/investments/import/')).toBe(true);
    expect(isImportPath('/ds/investments/tradebook')).toBe(false);
    expect(isImportPath('/ds/investments/i1')).toBe(false);
    expect(isImportPath('/ds/transactions/import')).toBe(false);
    expect(isImportPath(null)).toBe(false);
  });

  it('is not taken for a holding', () => {
    expect(isHoldingDetailPath('/ds/investments/import')).toBe(false);
  });

  it('belongs to no tab', () => {
    expect(activeInvestmentsTab('/ds/investments/import')).toBe('holdings');
  });
});
