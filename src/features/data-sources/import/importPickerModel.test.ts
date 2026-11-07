import { describe, expect, it } from 'vitest';

import { IMPORT_BACK_HREF, importKindRows } from './importPickerModel';

describe('importKindRows', () => {
  it('lists the four kinds of file, each leading to its existing flow', () => {
    expect(importKindRows.map((r) => [r.title, r.href])).toEqual([
      ['Bank or card statement', '/transactions/import'],
      ['Broker tradebook or CAS', '/investments/import'],
      ['EPF passbook', '/investments/import?type=epf'],
      ['NPS statement', '/investments/import?type=nps'],
    ]);
  });

  it('goes back to Transactions by default', () => {
    expect(IMPORT_BACK_HREF).toBe('/transactions');
  });
});
