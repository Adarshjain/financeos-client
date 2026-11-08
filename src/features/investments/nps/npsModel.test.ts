import { describe, expect, it } from 'vitest';

import {
  accountCard,
  accountOptions,
  allocationRows,
  choiceLabel,
  effectiveFy,
  entryRow,
  entryTitle,
  fyRange,
  type NpsAccount,
  type NpsEntry,
  npsFigures,
  type NpsScheme,
  type NpsSummary,
  npsUrl,
  parseNpsUrl,
  percentsTotal,
  schemeGroups,
  schemeSubtitle,
  thisFyLines,
  tier1StatusLine,
  unitsPreview,
  variantOptions,
} from './npsModel';

const account: NpsAccount = {
  id: 'a1',
  cra: 'PROTEAN',
  employer: { id: 'e1', name: 'Northwind Labs' },
  holderName: 'Me',
  latestStatementEnd: '2026-10-31',
  pranMasked: '********4821',
  readGmail: true,
  relation: 'SELF',
  schemeChoice: 'Active',
  sector: 'CORPORATE',
  status: 'ACTIVE',
  tier2Active: false,
  tiers: [{ tier: 'I', invested: 900000, gain: 100000, value: 1000000, schemes: [{ schemeCode: 'SM1', schemeName: 'HDFC Scheme E', units: 1000.5, nav: 50, value: 750000 }, { schemeCode: 'SM2', schemeName: 'HDFC Scheme G', units: 8000, nav: 31.25, value: 250000 }] }],
};

const summary: NpsSummary = {
  accounts: [account],
  allocation: [
    { accountId: 'a1', asOf: '2026-11-01', percent: 80, schemeCode: 'SM1', tier: 'I' },
    { accountId: 'a1', asOf: '2026-11-01', percent: 20, schemeCode: 'SM2', tier: 'I' },
  ],
  pendingGmail: [],
  lockedGmail: 0,
  failedGmail: 0,
  flags: { hasEstimated: false, navStale: true, statementStale: false, unitsMismatch: false },
  hero: { value: 1000000, invested: 900000, investedSelf: 700000, investedEmployer: 200000, dayChange: 1240, dayChangePct: 0.9, gain: 100000, gainPct: 11.1, xirr: 9.5, contributedThisFy: 120000, navAsOf: '2026-10-31' },
  holdings: [
    { accountId: 'a1', tier: 'I', schemeCode: 'SM1', schemeName: 'HDFC Scheme E', assetClass: 'E', estimated: true, units: 1000.5, nav: 50, navDate: '2026-10-31', value: 750000 },
    { accountId: 'a1', tier: 'I', schemeCode: 'SM2', schemeName: 'HDFC Scheme G', assetClass: 'G', estimated: false, units: 8000, nav: 31.25, navDate: '2026-10-31', value: 250000 },
  ],
  thisFy: { employer: 33600, self: 70000, byTier: [{ tier: 'I', self: 60000, employer: 33600 }, { tier: 'II', self: 10000, employer: 0 }] },
};

const entry = (over: Partial<NpsEntry> = {}): NpsEntry => ({
  id: 'n1',
  accountId: 'a1',
  amount: 5000,
  contributor: 'SELF',
  postedDate: '2026-11-04',
  source: 'EMAIL',
  status: 'CONFIRMED',
  tier: 'I',
  type: 'CONTRIBUTION',
  lines: [{ schemeCode: 'SM1', schemeName: 'Scheme E', units: 70.3771, nav: 53.2844, amount: 3750 }],
  ...over,
});

describe('npsUrl', () => {
  it('leaves defaults out and round-trips the filters', () => {
    expect(npsUrl(parseNpsUrl({}))).toBe('/investments/nps');
    const state = parseNpsUrl({ tier: 'II', type: 'CHARGE', page: '3', account: 'a1' });
    expect(state).toMatchObject({ tier: 'II', type: 'CHARGE', page: 2, account: 'a1' });
    expect(npsUrl(state)).toBe('/investments/nps?account=a1&tier=II&type=CHARGE&page=3');
  });
  it('reads the FY and From filters, with the current FY as the default', () => {
    const state = parseNpsUrl({ fy: '2025', contributor: 'EMPLOYER' });
    expect(state).toMatchObject({ fy: 2025, contributor: 'EMPLOYER' });
    expect(npsUrl(state)).toBe('/investments/nps?fy=2025&contributor=EMPLOYER');
    expect(parseNpsUrl({})).toMatchObject({ fy: null, contributor: '' });
    expect(npsUrl(parseNpsUrl({ fy: 'all' }))).toBe('/investments/nps?fy=all');
    expect(effectiveFy(parseNpsUrl({}), '2026-11-05')).toBe(2026);
    expect(effectiveFy(parseNpsUrl({}), '2027-02-05')).toBe(2026);
    expect(effectiveFy(parseNpsUrl({ fy: 'all' }), '2026-11-05')).toBeUndefined();
    expect(effectiveFy(parseNpsUrl({}), '2026-11-05', '2024-06-10')).toBe(2024);
    expect(effectiveFy(parseNpsUrl({}), '2026-11-05', '2025-02-10')).toBe(2024);
    expect(effectiveFy(parseNpsUrl({}), '2026-11-05', null)).toBe(2026);
    expect(effectiveFy(parseNpsUrl({ fy: '2025' }), '2026-11-05', '2024-06-10')).toBe(2025);
    expect(effectiveFy(parseNpsUrl({ fy: 'all' }), '2026-11-05', '2024-06-10')).toBeUndefined();
    expect(fyRange(2026)).toEqual({ from: '2026-04-01', to: '2027-03-31' });
    expect(fyRange(undefined)).toEqual({});
  });
  it('ignores a tier or type it does not know', () => {
    expect(parseNpsUrl({ tier: 'III', type: 'NOPE' })).toMatchObject({ tier: '', type: '' });
  });
});

describe('npsFigures', () => {
  it('words the hero, with the stale NAV line and the XIRR', () => {
    const f = npsFigures(summary);
    expect(f.value).toBe('₹10,00,000');
    expect(f.context).toBe("NAV as of 31 Oct · today's NAVs aren't out yet");
    expect(f.gain).toMatchObject({ value: '+₹1,00,000', caption: '+11.1% · XIRR 9.5%', tone: 'positive' });
  });
  it('words the day change on the NAV date, and the invested split', () => {
    const f = npsFigures({ ...summary, flags: { ...summary.flags, navStale: false } });
    expect(f.dayChange).toEqual({ text: '+₹1,240 (0.9%) on 31 Oct', tone: 'positive' });
    expect(f.investedSplit).toBe('You ₹7,00,000 · Employer ₹2,00,000');
  });
  it('hides the day change when null and Employer when 0', () => {
    const f = npsFigures({ ...summary, hero: { ...summary.hero, dayChange: null, dayChangePct: null, investedEmployer: 0 } });
    expect(f.dayChange).toBeNull();
    expect(f.investedSplit).toBe('You ₹7,00,000');
  });
  it('hides the XIRR when there is none', () => {
    const f = npsFigures({ ...summary, hero: { ...summary.hero, xirr: null }, flags: { ...summary.flags, navStale: false } });
    expect(f.gain.caption).toBe('+11.1%');
    expect(f.context).toBe('NAV as of 31 Oct');
  });
});

describe('schemeGroups', () => {
  it('builds a tier group with targets, share and the Estimated mark', () => {
    const [g] = schemeGroups(summary, account);
    expect(g.title).toBe('Tier I ₹10,00,000 · invested ₹9,00,000 · +₹1,00,000');
    expect(g.rows[0]).toMatchObject({ assetClass: 'Equity', estimated: true, target: '80%', units: '1,000.5', value: '₹7,50,000', amountSub: '75% · target 80%' });
    expect(g.rows[0].subtitle).toBe('Equity · Estimated');
    expect(g.rows[1].subtitle).toBe('Government bonds');
    expect(schemeSubtitle('', true)).toBe('Estimated');
    expect(schemeSubtitle('', false)).toBe('');
    expect(g.rows[1]).toMatchObject({ assetClass: 'Government bonds', estimated: false, nav: '₹31.25' });
  });
});

describe('entries', () => {
  it('titles each type', () => {
    expect(entryTitle(entry())).toBe('Contribution · You');
    expect(entryTitle(entry({ contributor: 'EMPLOYER' }))).toBe('Contribution · Employer');
    expect(entryTitle(entry({ type: 'CHARGE', description: 'Account maintenance' }))).toBe('Charges · Account maintenance');
    expect(entryTitle(entry({ type: 'OPENING' }))).toBe('Opening balance');
  });
  it('reads statement corrections grey, with units and no amount', () => {
    const adj = entryRow(entry({ type: 'ADJUSTMENT', source: 'STATEMENT', amount: 120, lines: [{ schemeCode: 'SM1', units: 1.5 }] }));
    expect(adj).toMatchObject({ title: 'Balance correction · per statement', muted: true, amount: '', units: '1.5' });
    const open = entryRow(entry({ type: 'OPENING', source: 'STATEMENT', amount: 5000 }));
    expect(open).toMatchObject({ title: 'Opening balance · per statement', muted: true });
    expect(open.amount).not.toBe('');
  });
  it('keeps a hand-made opening balance plain', () => {
    expect(entryRow(entry({ type: 'OPENING', source: 'MANUAL' }))).toMatchObject({ title: 'Opening balance', muted: false });
  });
  it('shows source and status words, units and a signed amount', () => {
    const row = entryRow(entry({ status: 'ESTIMATED', type: 'CHARGE', amount: -75, lines: [{ schemeCode: 'SM1', units: -2.6129 }] }));
    expect(row).toMatchObject({ source: 'Email', status: 'Estimated', units: '−2.6129', amount: '−₹75', context: 'Tier I · Email · Estimated' });
  });
  it('carries the linked bank payment, or null', () => {
    expect(entryRow(entry({ transactionId: 'tx-1' })).transactionId).toBe('tx-1');
    expect(entryRow(entry()).transactionId).toBeNull();
  });
  it('expands a switch into its lines', () => {
    const row = entryRow(entry({ type: 'SWITCH', amount: 0, lines: [{ schemeCode: 'A', schemeName: 'Out', units: -10 }, { schemeCode: 'B', units: 12 }] }));
    expect(row.title).toBe('Switch · 2 schemes');
    expect(row.units).toBe('—');
    expect(row.lines).toEqual([{ id: 'A', name: 'Out', units: '−10' }, { id: 'B', name: 'B', units: '12' }]);
  });
});

describe('side cards', () => {
  it('shows the account card with the masked PRAN and sector', () => {
    const card = accountCard(account);
    expect(card.lines).toContainEqual({ label: 'PRAN', value: '••••4821' });
    expect(card.lines).toContainEqual({ label: 'Sector', value: 'Corporate · Northwind Labs' });
    expect(card.lines).toContainEqual({ label: 'NPS emails', value: 'Read from Gmail' });
  });
  it('adds the Tier I status row right after PRAN, only when set', () => {
    expect(accountCard(account).lines.some((l) => l.label === 'Status')).toBe(false);
    const lines = accountCard({ ...account, tier1Status: 'ACTIVE', tier1StatusAsOf: '2026-10-31' }).lines;
    expect(lines[lines.findIndex((l) => l.label === 'PRAN') + 1]).toEqual({ label: 'Status', value: 'Active', subtitle: 'Per statement · Oct 2026' });
  });
  it('maps Frozen to the danger tone and Other to Check on CRA', () => {
    expect(tier1StatusLine({ ...account, tier1Status: 'FROZEN', tier1StatusAsOf: '2026-03-31' })).toEqual({ label: 'Status', value: 'Frozen', tone: 'danger', subtitle: 'Per statement · Mar 2026' });
    expect(tier1StatusLine({ ...account, tier1Status: 'OTHER', tier1StatusAsOf: null })).toEqual({ label: 'Status', value: 'Check on CRA' });
  });
  it('shows the statement scheme choice in sentence case', () => {
    expect(choiceLabel('AGGRESSIVE CHOICE')).toBe('Aggressive choice');
    expect(choiceLabel('Active')).toBe('Active');
  });
  it('shows only the Closed status row on a closed account', () => {
    const lines = accountCard({ ...account, status: 'CLOSED', tier1Status: 'FROZEN', tier1StatusAsOf: '2026-03-31' }).lines;
    expect(lines.filter((l) => l.label === 'Status')).toEqual([{ label: 'Status', value: 'Closed · history kept' }]);
  });
  it('shows a missing sector as Not set', () => {
    expect(accountCard({ ...account, sector: null, employer: undefined }).lines).toContainEqual({ label: 'Sector', value: 'Not set' });
  });
  it('adds the latest statement line only when a statement was imported', () => {
    expect(accountCard(account, 'Up to 31/10/26').lines).toContainEqual({ label: 'Latest statement', value: 'Up to 31/10/26' });
    expect(accountCard(account).lines.some((l) => l.label === 'Latest statement')).toBe(false);
  });
  it('lists the FY split per tier and skips zeros', () => {
    expect(thisFyLines(summary.thisFy).map((l) => l.label)).toEqual(['You · Tier I', 'Employer · Tier I', 'You · Tier II']);
  });
  it('offers an account picker only with several accounts', () => {
    expect(accountOptions([account])).toEqual([]);
    expect(accountOptions([account, { ...account, id: 'a2', relation: 'CHILD', holderName: 'Mia' }]).map((o) => o.label)).toEqual(['Mine ••4821', 'Mia ••4821']);
  });
});

describe('unitsPreview', () => {
  it('splits by allocation, the last scheme takes the rounding, and divides by the NAV', () => {
    const lines = unitsPreview(5000, [{ schemeCode: 'E', percent: 75 }, { schemeCode: 'C', percent: 15 }, { schemeCode: 'G', percent: 10 }], { E: 53.2844, C: 30.6975, G: 28.7035 });
    expect(lines.map((l) => l.part)).toEqual([3750, 750, 500]);
    expect(lines[0].units).toBe(70.3771);
    expect(lines[1].units).toBe(24.432);
    expect(lines[2].units).toBe(17.4195);
  });
  it('gives no units without a NAV', () => {
    expect(unitsPreview(100, [{ schemeCode: 'E', percent: 100 }], {})[0].units).toBeNull();
  });
});

describe('add account helpers', () => {
  const scheme = (code: string, assetClass: string, pfmCode = 'PFM1', variant: NpsScheme['variant'] = 'DIRECT', tier: NpsScheme['tier'] = 'I'): NpsScheme => ({ schemeCode: code, instrumentId: code, name: code, assetClass, pfmCode, pfmName: 'HDFC Pension Fund', tier, variant });
  const schemes = [scheme('E1', 'E'), scheme('C1', 'C'), scheme('G1', 'G'), scheme('E2', 'E', 'PFM1', 'POP')];
  it('totals the percents', () => {
    expect(percentsTotal({ E: '75', C: '15', G: '10', A: '0' })).toBe(100);
  });
  it('maps percents onto the schemes of the plan, skipping zero classes', () => {
    expect(allocationRows({ E: '75', C: '15', G: '10', A: '0' }, schemes.slice(0, 3))).toEqual([{ schemeCode: 'E1', percent: 75 }, { schemeCode: 'C1', percent: 15 }, { schemeCode: 'G1', percent: 10 }]);
  });
  it('fails when a class with a percent has no scheme', () => {
    expect(allocationRows({ E: '50', C: '0', G: '0', A: '50' }, schemes)).toBeNull();
  });
  it('lists the plans a fund offers in the tier', () => {
    expect(variantOptions(schemes, 'PFM1', 'I').map((v) => v.value)).toEqual(['DIRECT', 'POP']);
  });
});
