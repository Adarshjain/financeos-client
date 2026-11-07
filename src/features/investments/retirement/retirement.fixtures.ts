import type { NpsAccount, NpsSummary } from '../nps/npsModel';

/** An NPS account with one Tier I and one Tier II value. */
export function npsAccount(overrides: Partial<NpsAccount> = {}): NpsAccount {
  return {
    id: 'a1',
    cra: 'PROTEAN',
    holderName: 'Ravi',
    pranMasked: 'XXXXXXX7731',
    readGmail: true,
    relation: 'SELF',
    sector: 'ALL_CITIZEN',
    status: 'ACTIVE',
    tier1Status: 'ACTIVE',
    tier2Active: true,
    tiers: [
      { tier: 'I', value: 400000, invested: 300000, gain: 100000, schemes: [] },
      { tier: 'II', value: 194880, invested: 150000, gain: 44880, schemes: [] },
    ],
    ...overrides,
  } as NpsAccount;
}

export function npsSummary(accounts: NpsAccount[], navDates: Record<string, string> = {}): NpsSummary {
  return {
    accounts,
    holdings: accounts.flatMap((a) => (navDates[a.id] ? [{ accountId: a.id, navDate: navDates[a.id], tier: 'I', schemeCode: 'S', schemeName: 'Scheme', units: 1, value: 1, estimated: false }] : [])),
    allocation: [],
    flags: { hasEstimated: false, navStale: false, statementStale: false, unitsMismatch: false },
    hero: { value: 0 },
    pendingGmail: [],
    failedGmail: 0,
    lockedGmail: 0,
  } as unknown as NpsSummary;
}
