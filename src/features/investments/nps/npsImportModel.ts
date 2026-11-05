import { formatFileSize, MAX_REQUEST_BYTES, MAX_REQUEST_MB } from '@/features/transactions/import/fileLimits';
import type { components } from '@/lib/api/schema';
import { formatDate, formatMoney } from '@/lib/format';

import { INVESTMENTS_IMPORT_HREF } from '../investmentsTabs';
import { formatUnits, TYPE_LABEL } from './npsModel';

type Schemas = components['schemas'];
export type NpsImportResult = Schemas['NpsImportResultResponse'];
export type NpsImportCommitRequest = Schemas['NpsImportCommitRequest'];
export type NpsStatement = Schemas['NpsStatementResponse'];

export type NpsPreview = Schemas['NpsImportPreviewResponse'];
export type NpsPreviewRow = Schemas['NpsImportRow'];
export type NpsRelation = 'SELF' | 'CHILD';
export type NpsSectorValue = NonNullable<Schemas['NpsImportNewAccount']['sector']>;

/** The picks for a new account whose sector the statement did not say. */
export interface NewAccountPicks {
  relation?: NpsRelation;
  sector?: NpsSectorValue;
}

export const NPS_IMPORT_TYPE = 'nps';
export const NPS_UPLOAD_HREF = `${INVESTMENTS_IMPORT_HREF}?type=${NPS_IMPORT_TYPE}`;
export const NPS_ACCEPT = '.pdf';
/** Most statements one import takes. */
export const NPS_MAX_FILES = 12;
/** Rows listed in the review before "first N of M". */
export const REVIEW_ROWS = 4;

export const PASSWORD_HINT = "We tried your date of birth and name. We'll remember what works.";

/** One queued statement: its file, what the server said, and the password typed for it. */
export interface NpsImportFile {
  id: string;
  file: File;
  password: string;
  preview: NpsPreview | null;
  /** What went wrong reading it (the server's words), when the read failed. */
  error: string | null;
  picks: NewAccountPicks;
  /** What the server said when this file was committed; set on a partial failure so a retry skips it. */
  committed?: NpsImportResult | null;
}

let seq = 0;
export const newImportFile = (file: File): NpsImportFile => ({ id: `${++seq}-${file.name}`, file, password: '', preview: null, error: null, picks: {} });

/** Adds files to the queue, skipping an exact name + size repeat and anything past the file or size cap; `error` says what was left out. */
export function addNpsFiles(current: NpsImportFile[], added: File[]): { files: NpsImportFile[]; error: string | null } {
  const files = [...current];
  let total = files.reduce((sum, f) => sum + f.file.size, 0);
  let error: string | null = null;
  for (const f of added) {
    if (files.some((c) => c.file.name === f.name && c.file.size === f.size)) continue;
    if (files.length >= NPS_MAX_FILES) {
      error = `You can import up to ${NPS_MAX_FILES} statements at a time. Remove some files and try again.`;
      continue;
    }
    if (total + f.size > MAX_REQUEST_BYTES) {
      error = `Upload would be ${formatFileSize(total + f.size)}; the limit is ${MAX_REQUEST_MB}MB per upload. Remove some files and try again.`;
      continue;
    }
    files.push(newImportFile(f));
    total += f.size;
  }
  return { files, error };
}

export type NpsFileState = 'unread' | 'password' | 'failed' | 'ready';

export function fileState(f: NpsImportFile): NpsFileState {
  if (f.error) return 'failed';
  if (!f.preview) return 'unread';
  return f.preview.passwordNeeded ? 'password' : 'ready';
}

const pran = (masked: string) => `••${masked.slice(-4)}`;
const range = (s: { periodStart: string; periodEnd: string }) => `${formatDate(s.periodStart, 'full')} – ${formatDate(s.periodEnd, 'full')}`;

export const isNewAccount = (p: NpsPreview) => !p.account?.id;

/** "Mine ••1234 (matched by PRAN)", "<holder>'s ••1234", or "New account from this statement". */
export function accountLine(p: NpsPreview): string {
  const a = p.account;
  if (!a?.id) return 'New account from this statement';
  const last4 = a.pranLast4 ?? p.statement?.pranMasked.slice(-4) ?? '';
  const tail = last4 ? ` ••${last4}` : '';
  return a.relation === 'CHILD' ? `${a.holderName ?? 'Child'}'s${tail}` : `Mine${tail} (matched by PRAN)`;
}

/** "PRAN ••1234 · 1 Apr 26 – 31 Oct 26". */
export function statementTitle(p: NpsPreview): string {
  const s = p.statement;
  return s ? `PRAN ${pran(s.pranMasked)} · ${range(s)}` : '';
}

/** The new account's sector when the statement says it or the owner picked it. */
export const sectorOf = (f: NpsImportFile): NpsSectorValue | null | undefined => f.picks.sector ?? f.preview?.account?.proposal?.sector;

/** A new account needs a sector before it can be created. */
export function needsPick(f: NpsImportFile): boolean {
  const p = f.preview;
  return !!p && !p.passwordNeeded && isNewAccount(p) && !sectorOf(f);
}

/** A file that will add or upgrade something on import. */
export function importable(f: NpsImportFile): boolean {
  const r = f.preview?.result;
  return !f.committed && !!r && !f.preview?.passwordNeeded && !!f.preview?.previewId && r.added + r.upgraded > 0;
}

export const importableCount = (files: NpsImportFile[]) => files.reduce((n, f) => n + (importable(f) ? (f.preview!.result!.added + f.preview!.result!.upgraded) : 0), 0);

/** Every file that would import must have what a new account needs. */
export const readyToImport = (files: NpsImportFile[]) => files.some(importable) && !files.some((f) => importable(f) && needsPick(f));

/** True when the statement has nothing new: every line is already here. */
export function alreadyImported(p: NpsPreview): boolean {
  const r = p.result;
  return !!r && r.added + r.upgraded === 0 && r.skipped > 0;
}

export interface ReviewLine {
  label: string;
  value: string;
  tone?: 'warning';
}

/** "Scheme C" from "HDFC Pension Fund Scheme C - Tier I"; the whole name when it has no such part. */
export function shortScheme(name: string | null | undefined): string {
  if (!name) return '';
  return /Scheme\s+[A-Z]\b(?:\s+Tier\s+(?:I|II)\b)?/i.exec(name)?.[0].replace(/\s+Tier\s+(?:I|II)$/i, '') ?? name;
}

/** The review's lines for one read statement. */
export function reviewLines(p: NpsPreview): ReviewLine[] {
  const r = p.result;
  const lines: ReviewLine[] = [{ label: 'Account', value: accountLine(p) }];
  if (!r) return lines;
  lines.push({ label: 'New entries', value: String(r.added) });
  if (r.upgraded > 0) lines.push({ label: 'Email entries confirmed', value: `${r.upgraded} · exact units replace estimates` });
  lines.push({ label: 'Already here', value: `${r.skipped} · skipped` });
  if (r.unitsMismatch) {
    const off = r.adjustments.map((a) => `${shortScheme(a.schemeName) || a.schemeCode} is ${formatUnits(Math.abs(a.units))} units off`).join(' · ');
    lines.push({ label: 'Units', value: off || "Units don't match the statement", tone: 'warning' });
  } else {
    lines.push({ label: 'Units', value: 'Match the statement' });
  }
  if (r.unmapped.length > 0) lines.push({ label: 'Not in the catalog', value: `${r.unmapped.join(', ')} · skipped`, tone: 'warning' });
  return lines;
}

/** The grey line for a statement Protean sent without figures, else null. */
export function incompleteLine(p: NpsPreview, cra = 'Protean'): string | null {
  return p.result?.incomplete ? `${cra} sent this month without figures; the next statement corrects it.` : null;
}

export interface PreviewRowView {
  id: string;
  date: string;
  tier: string;
  entry: string;
  units: string;
  amount: string;
}

/** What a row of the review shows. */
export function previewRow(row: NpsPreviewRow, index: number): PreviewRowView {
  return {
    id: `${index}-${row.date}-${row.schemeCode ?? ''}`,
    date: formatDate(row.date, 'list'),
    tier: row.tier,
    entry: [TYPE_LABEL[row.type] ?? row.type, row.description].filter(Boolean).join(' · '),
    units: row.units == null ? '—' : formatUnits(row.units),
    amount: row.amount == null ? '—' : formatMoney(row.amount, { decimals: 'auto' }),
  };
}

/** The rows to list: the ones the import will touch first. */
export function firstRows(p: NpsPreview): { shown: NpsPreviewRow[]; total: number } {
  const touched = p.rows.filter((r) => r.action === 'ADD' || r.action === 'UPGRADE');
  return { shown: touched.slice(0, REVIEW_ROWS), total: touched.length };
}

/** The commit body for one read statement. */
export function commitBody(f: NpsImportFile, created: Record<string, string> = {}): NpsImportCommitRequest {
  const p = f.preview!;
  if (p.account?.id) return { previewId: p.previewId ?? undefined };
  // An earlier file of this batch already created the account for this PRAN: add to it, never create a second.
  const known = p.statement ? created[p.statement.pranMasked] : undefined;
  if (known) return { previewId: p.previewId ?? undefined, accountId: known };
  const proposal = p.account?.proposal;
  return {
    previewId: p.previewId ?? undefined,
    newAccount: {
      holderName: proposal?.holderName ?? p.statement?.holderName ?? null,
      relation: f.picks.relation ?? proposal?.relation ?? 'SELF',
      sector: sectorOf(f) ?? null,
      cra: proposal?.cra ?? null,
    },
  };
}

export interface NpsImportTotals {
  statements: number;
  added: number;
  upgraded: number;
  skipped: number;
}

export function totalsOf(results: NpsImportResult[]): NpsImportTotals {
  return results.reduce(
    (t, r) => ({ statements: t.statements + 1, added: t.added + r.added, upgraded: t.upgraded + r.upgraded, skipped: t.skipped + r.skipped }),
    { statements: 0, added: 0, upgraded: 0, skipped: 0 },
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const resultTitle = (t: NpsImportTotals) => `${plural(t.added, 'entry', 'entries')} added`;

export function resultLine(t: NpsImportTotals): string {
  const parts = [`From ${plural(t.statements, 'statement', 'statements')}`];
  if (t.upgraded > 0) parts.push(`${t.upgraded} email ${t.upgraded === 1 ? 'entry' : 'entries'} confirmed with exact units`);
  if (t.skipped > 0) parts.push(`${t.skipped} already here`);
  return parts.join(' · ');
}

/** "Up to 31 Oct 26". */
export const upToLine = (end: string) => `Up to ${formatDate(end, 'full')}`;

export function statementRowTitle(s: NpsStatement): string {
  return `Tier ${s.tier} · ${range(s)}`;
}

export function statementRowSub(s: NpsStatement): string {
  const from = s.source === 'GMAIL' ? 'From Gmail' : 'Uploaded';
  const notes = [s.incomplete ? 'Without figures' : null, s.unitsMismatch ? 'Units off' : null].filter(Boolean);
  return [`${from} ${formatDate(s.importedAt, 'full')}`, ...notes].join(' · ');
}
