import { formatFileSize, MAX_REQUEST_BYTES, MAX_REQUEST_MB } from '@/features/transactions/import/fileLimits';
import type { Schemas } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';


export type EpfPreview = Schemas['EpfImportPreviewResponse'];
export type EpfPreviewRow = Schemas['EpfImportRow'];
export type EpfImportResult = Schemas['EpfImportResultResponse'];
export type EpfBatchPreview = Schemas['EpfImportBatchPreviewResponse'];
export type EpfSection = Schemas['EpfImportSection'];
export type EpfRefusedFile = Schemas['EpfImportRefusedFile'];
export type EpfBatchResult = Schemas['EpfImportBatchResultResponse'];

/** Most passbooks one import takes. */
export const EPF_MAX_FILES = 12;

/** Adds files to the queue, skipping an exact name + size repeat and anything past the file or size cap; `error` says what was left out. */
export function addEpfFiles(current: File[], added: File[]): { files: File[]; error: string | null } {
  const files = [...current];
  let total = files.reduce((sum, f) => sum + f.size, 0);
  let error: string | null = null;
  for (const f of added) {
    if (files.some((c) => c.name === f.name && c.size === f.size)) continue;
    if (files.length >= EPF_MAX_FILES) {
      error = `You can import up to ${EPF_MAX_FILES} passbooks at a time. Remove some files and try again.`;
      continue;
    }
    if (total + f.size > MAX_REQUEST_BYTES) {
      error = `Upload would be ${formatFileSize(total + f.size)}; the limit is ${MAX_REQUEST_MB}MB per upload. Remove some files and try again.`;
      continue;
    }
    files.push(f);
    total += f.size;
  }
  return { files, error };
}

export const EPF_ACCEPT = '.pdf';
/** The Employer select's value for "the employer in this passbook is new". */
export const NEW_EMPLOYER = 'new';
/** Server error codes the upload step shows as a banner with the server's own message. */
export const EPF_UPLOAD_ERROR_CODES = ['NOT_A_PASSBOOK', 'PASSWORD_PROTECTED', 'UNREADABLE', 'UAN_MISMATCH', 'VALIDATION_ERROR'];

/** "FY 2025-26" from the year the financial year starts in. */
export function fullFy(startYear: number): string {
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

const STATUS_WORDS: Record<EpfPreviewRow['status'], string> = {
  NEW: 'New',
  REPLACES: 'Replaces the one you added',
  EXISTS: 'Already here',
};
export const statusWord = (status: EpfPreviewRow['status']) => STATUS_WORDS[status];
export const statusTone = (status: EpfPreviewRow['status']) => (status === 'NEW' ? 'success' : status === 'REPLACES' ? 'warning' : 'neutral');

const TYPE_WORDS: Record<EpfPreviewRow['type'], string> = {
  OPENING_BALANCE: 'Opening balance',
  CONTRIBUTION: 'Contribution',
  TRANSFER_IN: 'Transfer in',
  INTEREST: 'Interest',
  TRANSFER_OUT: 'Transfer out',
  WITHDRAWAL: 'Withdrawal',
};
const KIND_WORDS = { PARTIAL: 'Partial', FINAL_SETTLEMENT: 'Final settlement', PENSION: 'Pension' } as const;

export interface EpfReviewRow {
  id: string;
  /** The wage month, the financial year of an interest credit, or the day for the rest. */
  period: string;
  particulars: string;
  detail: string;
  /** For an opening balance that disagrees with the user's entries: both figures; '' otherwise. */
  mismatch: string;
  /** The entry's total (phone), then each share as the EPF passbook draws it (desktop). */
  amount: string;
  employee: string;
  employer: string;
  pension: string;
  status: EpfPreviewRow['status'];
}

export function epfRow(r: EpfPreviewRow): EpfReviewRow {
  const period =
    r.type === 'CONTRIBUTION' && r.wageMonth
      ? formatDate(r.wageMonth, 'month')
      : r.type === 'INTEREST' && r.interestFy
        ? fullFy(r.interestFy)
        : formatDate(r.creditedOn, 'full');
  const named = r.type === 'TRANSFER_IN' || r.type === 'TRANSFER_OUT' || r.type === 'WITHDRAWAL';
  const kind = r.type === 'WITHDRAWAL' && r.withdrawalKind ? KIND_WORDS[r.withdrawalKind] : '';
  const pensionOnly = r.type === 'WITHDRAWAL' && r.withdrawalKind === 'PENSION';
  const out = r.type === 'WITHDRAWAL' || r.type === 'TRANSFER_OUT';
  const sign = (n: number) => (r.type === 'OPENING_BALANCE' ? formatMoney(n, { decimals: 'auto' }) : out ? `−${formatMoney(n, { decimals: 'auto' })}` : `+${formatMoney(n, { decimals: 'auto' })}`);
  const total = pensionOnly ? r.pensionAmount : r.employeeAmount + r.employerAmount;
  const dash = '—';
  const mismatch =
    r.type === 'OPENING_BALANCE' && r.computedEmployeeAmount != null && r.computedEmployerAmount != null
      ? `Your entries come to ${formatMoney(r.computedEmployeeAmount + r.computedEmployerAmount, { decimals: 'auto' })}, EPFO says ${formatMoney(r.employeeAmount + r.employerAmount, { decimals: 'auto' })}`
      : '';
  return {
    id: String(r.index),
    period,
    particulars: (named && r.particulars) || TYPE_WORDS[r.type],
    detail: [kind, named && r.particulars ? TYPE_WORDS[r.type] : ''].filter(Boolean).join(' · '),
    mismatch,
    amount: out ? formatMoney(-total, { decimals: 'auto' }) : formatMoney(total, { decimals: 'auto' }),
    employee: pensionOnly ? dash : sign(r.employeeAmount),
    employer: pensionOnly ? dash : sign(r.employerAmount),
    pension: pensionOnly || (r.type === 'CONTRIBUTION' && r.pensionAmount > 0) ? formatMoney(r.pensionAmount, { decimals: 'auto' }) : dash,
    status: r.status,
  };
}

/** "8 entries in this passbook: 2 new, 1 replaces an entry you added, 5 are already here." */
export function countsLine(p: EpfPreview): string {
  const total = p.newCount + p.replacesCount + p.existsCount;
  const parts: string[] = [];
  if (p.newCount > 0) parts.push(`${p.newCount} new`);
  if (p.replacesCount > 0) parts.push(p.replacesCount === 1 ? '1 replaces an entry you added' : `${p.replacesCount} replace entries you added`);
  if (p.existsCount > 0) parts.push(p.existsCount === 1 ? '1 is already here' : `${p.existsCount} are already here`);
  const line = `${total} ${total === 1 ? 'entry' : 'entries'} in this passbook${parts.length ? `: ${parts.join(', ')}` : ''}.`;
  const n = p.matchedOpeningCount;
  if (n <= 0) return line;
  return `${line} ${n === 1 ? '1 opening balance matches your entries, so it is not imported.' : `${n} opening balances match your entries, so they are not imported.`}`;
}

/** The section warning for opening balances that disagree with the user's entries; '' when none do. */
export function mismatchLine(p: EpfPreview): string {
  const n = p.rows.filter((r) => r.type === 'OPENING_BALANCE' && r.computedEmployeeAmount != null && r.computedEmployerAmount != null).length;
  if (n === 0) return '';
  return n === 1
    ? "1 opening balance does not match your entries. Importing keeps EPFO's figure as a correction."
    : `${n} opening balances do not match your entries. Importing keeps EPFO's figures as corrections.`;
}

export const PENSION_NOTE = 'Pension figures are kept but not added to the balance.';

export const importableCount = (p: EpfPreview) => p.newCount + p.replacesCount;

/** Entries the import would add or replace across every section. */
export const importableTotal = (sections: EpfSection[]) => sections.reduce((sum, s) => sum + importableCount(s.preview), 0);

/** "fy1.pdf (This is not an EPFO passbook.)" */
export const refusedItem = (r: EpfRefusedFile) => `${r.fileName} (${r.message})`;

/** The `assign` query values ("<sectionKey>=<employerId>") for every section whose employer was picked, with `override` swapped in for one. */
export function assignParams(sections: EpfSection[], choices: Record<string, EpfEmployerChoices>, override?: { key: string; value: string }): string[] {
  const out: string[] = [];
  for (const s of sections) {
    if (!choices[s.key]) continue;
    const value = override?.key === s.key ? override.value : (s.preview.employer.existingId ?? NEW_EMPLOYER);
    if (value !== NEW_EMPLOYER) out.push(`${s.key}=${value}`);
  }
  return out;
}

/** "Northwind Labs · FY 2026-27"-style sub line: "Member ID …67890 · UAN …4321 · up to Sep 2026". */
export function employerSub(p: EpfPreview): string {
  const last = p.employer.throughMonth;
  return [
    p.employer.memberId ? `Member ID …${p.employer.memberId.slice(-5)}` : '',
    p.employer.uanLast4 ? `UAN …${p.employer.uanLast4}` : '',
    last ? `up to ${formatDate(last, 'month')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Northwind Labs · FY 2026-27": the financial year the passbook runs up to. */
export function employerTitle(p: EpfPreview): string {
  const through = p.employer.throughMonth;
  if (!through) return p.employer.name;
  const year = Number(through.slice(0, 4));
  return `${p.employer.name} · ${fullFy(Number(through.slice(5, 7)) >= 4 ? year : year - 1)}`;
}

export interface EpfEmployerChoices {
  newName: string;
  options: EpfPreview['employerOptions'];
}

export const employerOptionsOf = (c: EpfEmployerChoices) => [
  { value: NEW_EMPLOYER, label: `New employer: ${c.newName}` },
  ...c.options.map((o) => ({ value: o.id, label: o.name })),
];

export const resultTitle = (r: EpfBatchResult) => {
  const n = r.imported + r.replaced;
  return `Imported ${n} ${n === 1 ? 'entry' : 'entries'}`;
};

/** "2 new and 1 replaced across 2 employers. EPF balance is now ₹8,43,210, up to Sep 2026." */
export const resultLine = (r: EpfBatchResult) => {
  const parts = [`${r.imported} new`, ...(r.replaced > 0 ? [`${r.replaced} replaced`] : [])];
  const head = `${parts.join(' and ')}${r.results.length > 1 ? ` across ${r.results.length} employers` : ''}`;
  const through = r.results.reduce<string>((latest, x) => (x.throughMonth && x.throughMonth > latest ? x.throughMonth : latest), '');
  const balance = `EPF balance is now ${formatMoney(r.balance, { decimals: 'auto' })}${through ? `, up to ${formatDate(through, 'month')}` : ''}.`;
  return `${head.charAt(0).toUpperCase()}${head.slice(1)}. ${balance}`;
};
