import { describe, expect, it } from 'vitest';

import { parseImportUrl } from './importUrl';

describe('parseImportUrl', () => {
  it('opens on the EPF passbook for ?type=epf', () => {
    expect(parseImportUrl({ type: 'epf' })).toEqual({ initialMode: 'epf_passbook' });
    expect(parseImportUrl({ type: ['epf', 'x'] })).toEqual({ initialMode: 'epf_passbook' });
  });

  it('opens on the NPS statement for ?type=nps', () => {
    expect(parseImportUrl({ type: 'nps' })).toEqual({ initialMode: 'nps_statement' });
  });

  it('keeps the default for any other or no type', () => {
    expect(parseImportUrl({ type: 'x' })).toEqual({ initialMode: undefined });
    expect(parseImportUrl({})).toEqual({ initialMode: undefined });
  });
});
