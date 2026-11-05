import { ASSET_CLASSES, type NpsEntryRequest, type NpsEntryType, type NpsScheme, type NpsTier, unitsPreview } from './npsModel';

export interface NpsEntryFormState {
  accountId: string;
  type: Extract<NpsEntryType, 'CONTRIBUTION' | 'CHARGE' | 'WITHDRAWAL' | 'SWITCH' | 'OPENING'>;
  contributor: 'SELF' | 'EMPLOYER';
  tier: NpsTier;
  /** yyyy-mm-dd. */
  date: string;
  amount: string;
  note: string;
  /** Units the user typed, by scheme code; a scheme not here shows the estimate. */
  units: Record<string, string>;
}

export interface NpsUnitsRow {
  schemeCode: string;
  percent: number;
  part: number;
  nav: number | null;
  /** The estimate (signed for charges and withdrawals); null for a switch or without a NAV. */
  estimate: number | null;
}

const SIGN: Record<NpsEntryFormState['type'], number> = { CONTRIBUTION: 1, OPENING: 1, CHARGE: -1, WITHDRAWAL: -1, SWITCH: 0 };

export const emptyEntryForm = (accountId: string, today: string): NpsEntryFormState => ({
  accountId,
  type: 'CONTRIBUTION',
  contributor: 'SELF',
  tier: 'I',
  date: today,
  amount: '',
  note: '',
  units: {},
});

/** The units table: the account's allocation for the tier, each scheme with its part of the amount and the units it buys. */
export function unitsRows(form: NpsEntryFormState, allocation: { schemeCode: string; percent: number }[], schemes: NpsScheme[]): NpsUnitsRow[] {
  const navs = Object.fromEntries(schemes.map((s) => [s.schemeCode, s.nav]));
  const amount = Math.abs(Number(form.amount)) || 0;
  const sign = SIGN[form.type];
  return unitsPreview(amount, allocation, navs).map((l) => ({
    schemeCode: l.schemeCode,
    percent: l.percent,
    part: l.part,
    nav: l.nav,
    estimate: sign === 0 || amount === 0 || l.units == null ? null : sign * l.units,
  }));
}

/** The text a units field shows: what the user typed, else the estimate. */
export const unitsText = (row: NpsUnitsRow, typed: Record<string, string>): string => typed[row.schemeCode] ?? (row.estimate == null ? '' : String(row.estimate));

/**
 * The request for the form. A contribution or opening balance whose units were not edited sends no lines (the server estimates it at the entry date's NAV and marks it Estimated);
 * every other type sends the units shown. An error is the sentence to show.
 */
export function entryRequest(form: NpsEntryFormState, rows: NpsUnitsRow[], schemes: NpsScheme[]): { body: NpsEntryRequest } | { error: string } {
  const amount = Math.abs(Number(form.amount)) || 0;
  const needsAmount = form.type !== 'SWITCH';
  if (needsAmount && amount <= 0) return { error: 'Enter an amount above zero.' };
  if (!form.date) return { error: 'Pick a date.' };
  const edited = Object.keys(form.units).length > 0;
  const base: NpsEntryRequest = {
    accountId: form.accountId,
    type: form.type,
    tier: form.tier,
    postedDate: form.date,
    note: form.note.trim() || null,
    ...(form.type === 'CONTRIBUTION' ? { contributor: form.contributor } : {}),
    ...(needsAmount ? { amount: form.type === 'CHARGE' ? -amount : amount } : {}),
  };
  if ((form.type === 'CONTRIBUTION' || form.type === 'OPENING') && !edited) return { body: base };
  const lines: NonNullable<NpsEntryRequest['lines']> = [];
  for (const r of rows) {
    const units = Number(unitsText(r, form.units));
    if (!Number.isFinite(units) || units === 0) continue;
    lines.push({ schemeCode: r.schemeCode, units, nav: r.nav });
  }
  if (lines.length === 0) {
    return { error: rows.some((r) => r.nav == null) ? "A NAV isn't out yet for these schemes. Type the units yourself." : 'Enter the units of at least one scheme.' };
  }
  const navDate = schemes.find((s) => s.schemeCode === lines[0].schemeCode)?.navDate ?? null;
  return { body: { ...base, lines, navDate } };
}

/** The Tier II rows for a Tier I allocation: the same percents on the same fund and plan's Tier II schemes; null when a class has no scheme. */
export function tierTwoRows(tierOne: { schemeCode: string; percent: number }[], schemes: NpsScheme[], pfm: string, variant: string) {
  const classOf = new Map(schemes.map((s) => [s.schemeCode, s.assetClass]));
  const rows: { schemeCode: string; percent: number }[] = [];
  for (const r of tierOne) {
    const c = classOf.get(r.schemeCode);
    const found = schemes.find((s) => s.pfmCode === pfm && s.variant === variant && s.tier === 'II' && s.assetClass === c && (ASSET_CLASSES as readonly string[]).includes(c ?? ''));
    if (!found) return null;
    rows.push({ schemeCode: found.schemeCode, percent: r.percent });
  }
  return rows;
}
