import { describe, expect, it } from 'vitest';

import { activeInvestmentsTab, INVESTMENTS_IMPORT_HREF } from './investmentsTabs';

describe('the Import tradebook path', () => {
  it('is its own page under /investments', () => {
    expect(INVESTMENTS_IMPORT_HREF).toBe('/investments/import');
  });

  it('belongs to no tab', () => {
    expect(activeInvestmentsTab('/investments/import')).toBe('holdings');
  });
});
