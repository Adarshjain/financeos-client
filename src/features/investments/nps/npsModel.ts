import { fyStartYear } from '@/features/loans/detail/financialYearModel';
import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { DS_PREFIX } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import type { components } from '@/lib/api/schema';
import { formatDate, formatMoney, formatPercent, formatQuantity, fyLabel } from '@/lib/format';

type Schemas = components['schemas'];
export type NpsSummary = Schemas['NpsSummaryResponse'];
export type NpsAccount = Schemas['NpsSummaryAccount'];
export type NpsTierSummary = Schemas['NpsSummaryTier'];
export type NpsHolding = Schemas['NpsSummaryHolding'];
export type NpsAllocationRow = Schemas['NpsSummaryAllocation'];
export type NpsScheme = Schemas['NpsSchemeResponse'];
export type NpsAccountRequest = Schemas['NpsAccountRequest'];
export type NpsAllocationRequest = Schemas['NpsAllocationRequest'];
export type NpsEntryRequest = Schemas['NpsEntryRequest'];
export type NpsEntryType = NonNullable<NpsEntryRequest['type']>;
export type NpsTier = 'I' | 'II';
export type NpsContributor = 'SELF' | 'EMPLOYER';
type ApiEntry = Schemas['NpsEntryResponse'];
export type NpsLine = Schemas['NpsEntryLineResponse'];
export type NpsEntry = ApiEntry;
export type NpsSchemeDetail = Schemas['NpsSchemeDetailResponse'];

// ---- URL state ---------------------------------------------------------------

export const NPS_HREF = `${DS_PREFIX}/investments/nps`;
export const NPS_SIZE_OPTIONS = [25, 50, 100];

export interface NpsUrlState {
  /** An account id; '' = the default (your own first account). */
  account: string;
  /** The FY (its start year) the ledger is filtered to; null = the current FY, 'all' = no date filter. */
  fy: number | 'all' | null;
  contributor: NpsContributor | '';
  tier: NpsTier | '';
  type: NpsEntryType | '';
  page: number;
  size: number;
}

export const DEFAULT_NPS_URL: NpsUrlState = { account: '', fy: null, contributor: '', tier: '', type: '', page: 0, size: DEFAULT_PAGE_SIZE };

export const ENTRY_TYPES: NpsEntryType[] = ['CONTRIBUTION', 'CHARGE', 'REBALANCE', 'SWITCH', 'MIGRATION', 'WITHDRAWAL', 'OPENING', 'ADJUSTMENT', 'OTHER'];

export function parseNpsUrl(params: SearchParamsRecord): NpsUrlState {
  const tier = first(params.tier);
  const type = first(params.type) as NpsEntryType | undefined;
  const fyParam = first(params.fy) ?? '';
  const contributor = first(params.contributor);
  return {
    account: (first(params.account) ?? '').trim(),
    fy: fyParam === 'all' ? 'all' : /^\d{4}$/.test(fyParam) && Number(fyParam) > 1900 ? Number(fyParam) : null,
    contributor: contributor === 'SELF' || contributor === 'EMPLOYER' ? contributor : '',
    tier: tier === 'I' || tier === 'II' ? tier : '',
    type: type && ENTRY_TYPES.includes(type) ? type : '',
    ...parsePage(params, { size: DEFAULT_PAGE_SIZE, sizes: NPS_SIZE_OPTIONS }),
  };
}

/** The NPS tab URL for a state: defaults stay out of the query string. */
export function npsUrl(state: NpsUrlState): string {
  const query = new URLSearchParams();
  if (state.account) query.set('account', state.account);
  if (state.fy !== null) query.set('fy', String(state.fy));
  if (state.contributor) query.set('contributor', state.contributor);
  if (state.tier) query.set('tier', state.tier);
  if (state.type) query.set('type', state.type);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${NPS_HREF}?${text}` : NPS_HREF;
}

/** The FY the ledger shows: the one chosen, else the FY of the newest entry (`newestDate`), else the current one; undefined for all years. */
export function effectiveFy(state: NpsUrlState, today: string, newestDate?: string | null): number | undefined {
  if (state.fy === 'all') return undefined;
  return state.fy ?? fyStartYear(newestDate || today);
}

/** The ledger's from/to for an FY (April to March); empty for all years. */
export function fyRange(fy: number | undefined): { from?: string; to?: string } {
  return fy === undefined ? {} : { from: `${fy}-04-01`, to: `${fy + 1}-03-31` };
}

/** FY choices: the current FY back ten years, the one in use, and all years. */
export function fyOptions(today: string, selected: number | undefined): { value: string; label: string }[] {
  const start = fyStartYear(today);
  const years = Array.from({ length: 11 }, (_, i) => start - i);
  if (selected !== undefined && !years.includes(selected)) years.push(selected);
  return [...years.map((y) => ({ value: String(y), label: fyLabel(y) })), { value: 'all', label: 'All years' }];
}

export const CONTRIBUTOR_OPTIONS = [
  { value: '', label: 'From anyone' },
  { value: 'SELF', label: 'From you' },
  { value: 'EMPLOYER', label: 'From employer' },
];

/** The account the tab shows: the one chosen, else your own first account (or the first of all). */
export function effectiveAccount(state: NpsUrlState, accounts: NpsAccount[]): NpsAccount | undefined {
  return accounts.find((a) => a.id === state.account) ?? accounts.find((a) => a.relation === 'SELF') ?? accounts[0];
}

// ---- Words -----------------------------------------------------------------------

export const ASSET_CLASS_LABEL: Record<string, string> = { E: 'Equity', C: 'Corporate debt', G: 'Government bonds', A: 'Alternative' };
export const ASSET_CLASSES = ['E', 'C', 'G', 'A'] as const;

export function assetClassLabel(code: string | null | undefined): string {
  return code ? (ASSET_CLASS_LABEL[code] ?? code) : '';
}

/** The line under a scheme name: the asset class and "Estimated", joined only when both are there. */
export function schemeSubtitle(assetClass: string, estimated: boolean): string {
  return [assetClass, estimated ? 'Estimated' : ''].filter(Boolean).join(' · ');
}

export const tierLabel = (tier: NpsTier) => `Tier ${tier}`;

export const TYPE_LABEL: Record<NpsEntryType, string> = {
  CONTRIBUTION: 'Contribution',
  CHARGE: 'Charges',
  REBALANCE: 'Rebalance',
  SWITCH: 'Switch',
  MIGRATION: 'Migration',
  WITHDRAWAL: 'Withdrawal',
  OPENING: 'Opening balance',
  ADJUSTMENT: 'Adjustment',
  OTHER: 'Other',
};

/** The types a new entry can be, as the design lists them. */
export const ENTRY_TYPE_OPTIONS = (['CONTRIBUTION', 'CHARGE', 'WITHDRAWAL', 'SWITCH', 'OPENING'] as const).map((value) => ({ value, label: TYPE_LABEL[value] }));
export const FILTER_TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...ENTRY_TYPES.map((value) => ({ value, label: TYPE_LABEL[value] }))];

export const SOURCE_LABEL: Record<ApiEntry['source'], string> = { MANUAL: 'Manual', STATEMENT: 'Statement', EMAIL: 'Email', BANK: 'Bank' };
export const SECTOR_LABEL: Record<NonNullable<NpsAccount['sector']>, string> = {
  ALL_CITIZEN: 'All citizen',
  CORPORATE: 'Corporate',
  GOVT: 'Government',
  VATSALYA: 'Vatsalya',
  UPS: 'UPS',
};
export const CRA_LABEL: Record<NpsAccount['cra'], string> = { PROTEAN: 'Protean', KFINTECH: 'KFintech', CAMS: 'CAMS' };
export const VARIANT_LABEL: Record<NpsScheme['variant'], string> = { NONE: 'Standard', DIRECT: 'Direct', GS: 'Government', POP: 'Through a PoP' };

// ---- Hero ------------------------------------------------------------------------

export interface NpsFigures {
  value: string;
  /** "NAV as of 4 Nov", or the stale-NAV line when today's NAVs are not out yet. */
  context: string;
  invested: string;
  /** "You ₹1,00,000 · Employer ₹50,000" (Employer left out when it is 0). */
  investedSplit: string;
  /** "+₹1,240 (0.9%) on 4 Nov", null without a day change. */
  dayChange: { text: string; tone: 'positive' | 'danger' | undefined } | null;
  gain: { value: string; caption: string; tone: 'positive' | 'danger' | undefined };
  contributed: { value: string; caption: string };
}

export function npsFigures(summary: NpsSummary): NpsFigures {
  const { hero, flags } = summary;
  const navDate = hero.navAsOf ? formatDate(hero.navAsOf, 'list') : '';
  const context = !navDate ? '' : flags.navStale ? `NAV as of ${navDate} · today's NAVs aren't out yet` : `NAV as of ${navDate}`;
  const dayChange =
    hero.dayChange != null && navDate
      ? {
          text: `${formatMoney(hero.dayChange, { sign: 'always' })}${hero.dayChangePct != null ? ` (${formatPercent(hero.dayChangePct)})` : ''} on ${navDate}${flags.navStale ? " · today's NAVs aren't out yet" : ''}`,
          tone: hero.dayChange > 0 ? ('positive' as const) : hero.dayChange < 0 ? ('danger' as const) : undefined,
        }
      : null;
  const caption = [
    hero.gainPct != null ? formatPercent(hero.gainPct, { sign: 'always' }) : '',
    hero.xirr != null ? `XIRR ${formatPercent(hero.xirr)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    value: formatMoney(hero.value),
    context,
    invested: formatMoney(hero.invested),
    investedSplit: [`You ${formatMoney(hero.investedSelf)}`, hero.investedEmployer !== 0 ? `Employer ${formatMoney(hero.investedEmployer)}` : ''].filter(Boolean).join(' · '),
    dayChange,
    gain: { value: formatMoney(hero.gain, { sign: 'always' }), caption, tone: hero.gain > 0 ? 'positive' : hero.gain < 0 ? 'danger' : undefined },
    contributed: { value: formatMoney(hero.contributedThisFy), caption: 'Since 1 Apr' },
  };
}

// ---- Schemes ----------------------------------------------------------------------

export interface NpsSchemeRow {
  /** `${tier}:${schemeCode}`. */
  id: string;
  tier: NpsTier;
  schemeCode: string;
  name: string;
  assetClass: string;
  estimated: boolean;
  /** "Equity · Estimated": only the parts that exist. */
  subtitle: string;
  /** "75%", or a dash when no target is set. */
  target: string;
  units: string;
  nav: string;
  value: string;
  /** Phone: "17,840.2215 × ₹53.2844" and "74% · target 75%". */
  phoneSub: string;
  amountSub: string;
}

export interface NpsTierGroup {
  tier: NpsTier;
  /** "Tier I ₹12,81,816 · invested ₹9,90,000 · +₹2,91,816". */
  title: string;
  rows: NpsSchemeRow[];
}

const navText = (nav: number | null | undefined) => (nav == null ? '—' : formatMoney(nav, { decimals: 'unit' }));

/** The tiers of one account, each with its schemes: units and value from the summary, class and Estimated from the holdings, target from the allocation. */
export function schemeGroups(summary: NpsSummary, account: NpsAccount): NpsTierGroup[] {
  return account.tiers.map((t) => {
    const targets = new Map(summary.allocation.filter((a) => a.accountId === account.id && a.tier === t.tier).map((a) => [a.schemeCode, a.percent]));
    const holdings = new Map(summary.holdings.filter((h) => h.accountId === account.id && h.tier === t.tier).map((h) => [h.schemeCode, h]));
    const rows = t.schemes.map((s): NpsSchemeRow => {
      const holding = holdings.get(s.schemeCode);
      const target = targets.get(s.schemeCode);
      const share = t.value > 0 ? (s.value / t.value) * 100 : 0;
      return {
        id: `${t.tier}:${s.schemeCode}`,
        tier: t.tier,
        schemeCode: s.schemeCode,
        name: s.schemeName,
        assetClass: assetClassLabel(holding?.assetClass),
        estimated: holding?.estimated ?? false,
        subtitle: schemeSubtitle(assetClassLabel(holding?.assetClass), holding?.estimated ?? false),
        target: target != null ? formatPercent(target, { decimals: 0 }) : '—',
        units: formatQuantity(s.units, 4),
        nav: navText(s.nav),
        value: formatMoney(s.value),
        phoneSub: `${formatQuantity(s.units, 4)} × ${navText(s.nav)}`,
        amountSub: target != null ? `${formatPercent(share, { decimals: 0 })} · target ${formatPercent(target, { decimals: 0 })}` : formatPercent(share, { decimals: 0 }),
      };
    });
    return {
      tier: t.tier,
      title: `${tierLabel(t.tier)} ${formatMoney(t.value)} · invested ${formatMoney(t.invested)} · ${formatMoney(t.gain, { sign: 'always' })}`,
      rows,
    };
  });
}

// ---- Entries ----------------------------------------------------------------------

export interface NpsEntryRow {
  id: string;
  day: string;
  date: string;
  weekday: string;
  title: string;
  /** A correction made from a statement: its title reads grey. */
  muted: boolean;
  /** Phone second line: "Tier I · Email". */
  context: string;
  tier: NpsTier;
  units: string;
  amount: string;
  source: string;
  /** "Estimated" or "Pending" (grey), else empty. */
  status: string;
  /** The bank payment this entry is linked to; null when none. */
  transactionId: string | null;
  /** A switch or rebalance opens to its lines. */
  lines: { id: string; name: string; units: string }[];
}

/** Units to four places, with the typographic minus. */
export const formatUnits = (n: number) => formatQuantity(n, 4).replace(/^-/, '−');

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const CONTRIBUTOR_LABEL = { SELF: 'You', EMPLOYER: 'Employer' } as const;

/** A statement-made entry: a balance correction (ADJUSTMENT) or an opening balance (OPENING from a statement). */
export const isStatementCorrection = (e: Pick<NpsEntry, 'type' | 'source'>) =>
  e.type === 'ADJUSTMENT' || (e.type === 'OPENING' && e.source === 'STATEMENT');

export function entryTitle(e: NpsEntry): string {
  if (e.type === 'ADJUSTMENT') return 'Balance correction · per statement';
  if (e.type === 'OPENING' && e.source === 'STATEMENT') return 'Opening balance · per statement';
  switch (e.type) {
    case 'CONTRIBUTION':
      return `Contribution · ${CONTRIBUTOR_LABEL[e.contributor ?? 'SELF']}`;
    case 'SWITCH':
    case 'REBALANCE':
    case 'MIGRATION':
      return e.lines.length > 1 ? `${TYPE_LABEL[e.type]} · ${e.lines.length} schemes` : TYPE_LABEL[e.type];
    case 'OTHER':
      return e.description || TYPE_LABEL.OTHER;
    default:
      return e.description ? `${TYPE_LABEL[e.type]} · ${e.description}` : TYPE_LABEL[e.type];
  }
}

const STATUS_LABEL: Partial<Record<ApiEntry['status'], string>> = { ESTIMATED: 'Estimated', PENDING: 'Pending' };
const isMove = (t: NpsEntryType) => t === 'SWITCH' || t === 'REBALANCE' || t === 'MIGRATION';

export function entryRow(e: NpsEntry): NpsEntryRow {
  const status = STATUS_LABEL[e.status] ?? '';
  const source = SOURCE_LABEL[e.source];
  const move = isMove(e.type);
  return {
    id: e.id,
    day: e.postedDate,
    date: formatDate(e.postedDate, 'list'),
    weekday: formatDate(e.postedDate, 'weekday').split(' ')[0],
    title: entryTitle(e),
    muted: isStatementCorrection(e),
    context: [`${tierLabel(e.tier)}`, source, status].filter(Boolean).join(' · '),
    tier: e.tier,
    units: move || e.lines.length === 0 ? '—' : formatUnits(sum(e.lines.map((l) => l.units))),
    amount: e.type === 'ADJUSTMENT' ? '' : e.amount == null ? '—' : formatMoney(e.amount, { decimals: 'auto' }),
    source,
    status,
    transactionId: e.transactionId ?? null,
    lines: move ? e.lines.map((l) => ({ id: l.schemeCode, name: l.schemeName || l.schemeCode, units: formatUnits(l.units) })) : [],
  };
}

// ---- Side cards ----------------------------------------------------------------------

export interface NpsAccountCard {
  id: string;
  lines: { label: string; value: string; tone?: 'danger'; subtitle?: string }[];
  closed: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-31" as "Oct 2026"; empty when the date is missing or malformed. */
export function monthYear(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? '');
  return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

/** The Tier I status row: label, danger tone for Frozen, and "Per statement · MMM yyyy" underneath. */
export function tier1StatusLine(a: NpsAccount): { label: string; value: string; tone?: 'danger'; subtitle?: string } | null {
  if (!a.tier1Status) return null;
  const asOf = monthYear(a.tier1StatusAsOf);
  const base = a.tier1Status === 'FROZEN' ? { value: 'Frozen', tone: 'danger' as const } : { value: a.tier1Status === 'ACTIVE' ? 'Active' : 'Check on CRA' };
  return { label: 'Status', ...base, ...(asOf ? { subtitle: `Per statement · ${asOf}` } : {}) };
}

/** A statement's scheme choice arrives upper case ("AGGRESSIVE CHOICE"): show it in sentence case. */
export function choiceLabel(choice: string): string {
  const lower = choice.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** `latestStatement` is the "Up to dd/mm/yyyy" line, when a statement has been imported. */
export function accountCard(a: NpsAccount, latestStatement?: string | null): NpsAccountCard {
  const sectorName = a.sector ? SECTOR_LABEL[a.sector] : 'Not set';
  const sector = a.employer ? `${sectorName} · ${a.employer.name}` : sectorName;
  // A closed account's own "Closed" status row replaces the statement's Tier I status.
  const status = a.status === 'CLOSED' ? null : tier1StatusLine(a);
  const lines: NpsAccountCard['lines'] = [
    { label: 'PRAN', value: `••••${a.pranMasked.slice(-4)}` },
    ...(status ? [status] : []),
    { label: 'Sector', value: sector },
    { label: 'Record keeper', value: CRA_LABEL[a.cra] },
    ...(latestStatement ? [{ label: 'Latest statement', value: latestStatement }] : []),
    ...(a.schemeChoice ? [{ label: 'Choice', value: choiceLabel(a.schemeChoice) }] : []),
    { label: 'NPS emails', value: a.readGmail ? 'Read from Gmail' : 'Off' },
    ...(a.status === 'CLOSED' ? [{ label: 'Status', value: 'Closed · history kept' }] : []),
  ];
  return { id: a.id, lines: a.relation === 'CHILD' ? [{ label: 'Holder', value: a.holderName }, ...lines] : lines, closed: a.status === 'CLOSED' };
}

export interface NpsFyLine {
  label: string;
  value: string;
}

/** The "This FY" card: yours and the employer's per tier. */
export function thisFyLines(thisFy: NpsSummary['thisFy']): NpsFyLine[] {
  const lines: NpsFyLine[] = [];
  for (const t of thisFy.byTier) {
    if (t.self !== 0) lines.push({ label: `You · ${tierLabel(t.tier)}`, value: formatMoney(t.self) });
    if (t.employer !== 0) lines.push({ label: `Employer · ${tierLabel(t.tier)}`, value: formatMoney(t.employer) });
  }
  return lines;
}

export interface NpsAllocationLine {
  label: string;
  value: string;
}

/** Allocation of one tier: each asset class "now / target" in percent, from the account's holdings and targets. */
export function allocationLines(summary: NpsSummary, account: NpsAccount, tier: NpsTier): NpsAllocationLine[] {
  const t = account.tiers.find((x) => x.tier === tier);
  if (!t) return [];
  const classOf = new Map(summary.holdings.filter((h) => h.accountId === account.id && h.tier === tier).map((h) => [h.schemeCode, h.assetClass ?? '']));
  const now = new Map<string, number>();
  for (const s of t.schemes) {
    const c = classOf.get(s.schemeCode) ?? '';
    now.set(c, (now.get(c) ?? 0) + s.value);
  }
  const target = new Map<string, number>();
  for (const a of summary.allocation.filter((x) => x.accountId === account.id && x.tier === tier)) {
    const c = classOf.get(a.schemeCode) ?? '';
    target.set(c, (target.get(c) ?? 0) + a.percent);
  }
  const classes = ASSET_CLASSES.filter((c) => now.has(c) || target.has(c));
  return classes.map((c) => {
    const share = t.value > 0 ? ((now.get(c) ?? 0) / t.value) * 100 : 0;
    const goal = target.get(c);
    return {
      label: `${assetClassLabel(c)} (${c})`,
      value: goal != null ? `${formatPercent(share, { decimals: 0 })} / ${formatPercent(goal, { decimals: 0 })}` : formatPercent(share, { decimals: 0 }),
    };
  });
}

/** The account choices of the picker; empty with a single account. */
export function accountOptions(accounts: NpsAccount[]): { value: string; label: string }[] {
  if (accounts.length < 2) return [];
  return accounts.map((a) => ({ value: a.id, label: `${a.relation === 'CHILD' ? a.holderName : 'Mine'} ••${a.pranMasked.slice(-4)}` }));
}

// ---- Unit estimates -------------------------------------------------------------------

export interface UnitsLine {
  schemeCode: string;
  percent: number;
  /** Rupees of the amount going to this scheme. */
  part: number;
  nav: number | null;
  /** Units the part buys at the NAV; null without a NAV. */
  units: number | null;
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Splits an amount by the allocation (the last scheme takes the rounding) and buys units at each NAV, as the server does. */
export function unitsPreview(amount: number, rows: { schemeCode: string; percent: number }[], navs: Record<string, number | null | undefined>): UnitsLine[] {
  let left = round(amount, 2);
  return rows.map((r, i) => {
    const part = i === rows.length - 1 ? left : round((amount * r.percent) / 100, 2);
    left = round(left - part, 2);
    const nav = navs[r.schemeCode] ?? null;
    return { schemeCode: r.schemeCode, percent: r.percent, part, nav, units: nav && nav > 0 ? round(part / nav, 4) : null };
  });
}

// ---- Allocation percents (Add account) ----------------------------------------------------

export type ClassPercents = Record<(typeof ASSET_CLASSES)[number], string>;

export const DEFAULT_PERCENTS: ClassPercents = { E: '75', C: '15', G: '10', A: '0' };

export function percentsTotal(p: ClassPercents): number {
  return ASSET_CLASSES.reduce((s, c) => s + (Number(p[c]) || 0), 0);
}

/** The allocation rows for the schemes of a fund and plan: a scheme per asset class with a percent above 0; null when a class with a percent has no scheme. */
export function allocationRows(percents: ClassPercents, schemes: NpsScheme[]): { schemeCode: string; percent: number }[] | null {
  const rows: { schemeCode: string; percent: number }[] = [];
  for (const c of ASSET_CLASSES) {
    const percent = Number(percents[c]) || 0;
    if (percent <= 0) continue;
    const scheme = schemes.find((s) => s.assetClass === c);
    if (!scheme) return null;
    rows.push({ schemeCode: scheme.schemeCode, percent });
  }
  return rows;
}

/** The pension funds in a scheme list, by name. */
export function pfmOptions(schemes: NpsScheme[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const s of schemes) if (s.pfmCode && !seen.has(s.pfmCode)) seen.set(s.pfmCode, s.pfmName ?? s.pfmCode);
  return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

/** The plan variants a fund offers in a tier. */
export function variantOptions(schemes: NpsScheme[], pfm: string, tier: NpsTier): { value: string; label: string }[] {
  const seen = new Set(schemes.filter((s) => s.pfmCode === pfm && s.tier === tier).map((s) => s.variant));
  return (['DIRECT', 'POP', 'GS', 'NONE'] as const).filter((v) => seen.has(v)).map((value) => ({ value, label: VARIANT_LABEL[value] }));
}

export const schemesOf = (schemes: NpsScheme[], pfm: string, variant: string, tier: NpsTier) =>
  schemes.filter((s) => s.pfmCode === pfm && s.variant === variant && s.tier === tier);
