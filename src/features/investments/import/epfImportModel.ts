import type { Schemas } from '@/lib/api/types';

import { rupees } from '../investmentsFormat';

export type EpfPreview = Schemas['EpfImportPreviewResponse'];
export type EpfPreviewRow = Schemas['EpfImportRow'];
export type EpfImportResult = Schemas['EpfImportResultResponse'];

export const EPF_ACCEPT = '.pdf';
/** The Employer select's value for "the employer in this passbook is new". */
export const NEW_EMPLOYER = 'new';
/** Server error codes the upload step shows as a banner with the server's own message. */
export const EPF_UPLOAD_ERROR_CODES = ['NOT_A_PASSBOOK', 'PASSWORD_PROTECTED', 'UNREADABLE', 'UAN_MISMATCH', 'VALIDATION_ERROR'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 2026" from an ISO date. */
export function monthYear(iso: string): string {
  const month = MONTHS[Number(iso.slice(5, 7)) - 1];
  return month ? `${month} ${iso.slice(0, 4)}` : '';
}

/** "1 Apr 2026" from an ISO date. */
export function dayMonthYear(iso: string): string {
  const month = MONTHS[Number(iso.slice(5, 7)) - 1];
  return month ? `${Number(iso.slice(8, 10))} ${month} ${iso.slice(0, 4)}` : '';
}

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
  amount: string;
  status: EpfPreviewRow['status'];
}

export function epfRow(r: EpfPreviewRow): EpfReviewRow {
  const period =
    r.type === 'CONTRIBUTION' && r.wageMonth
      ? monthYear(r.wageMonth)
      : r.type === 'INTEREST' && r.interestFy
        ? fullFy(r.interestFy)
        : dayMonthYear(r.creditedOn);
  const named = r.type === 'TRANSFER_IN' || r.type === 'TRANSFER_OUT' || r.type === 'WITHDRAWAL';
  const kind = r.type === 'WITHDRAWAL' && r.withdrawalKind ? KIND_WORDS[r.withdrawalKind] : '';
  const total = r.employeeAmount + r.employerAmount;
  return {
    id: String(r.index),
    period,
    particulars: (named && r.particulars) || TYPE_WORDS[r.type],
    detail: [kind, named && r.particulars ? TYPE_WORDS[r.type] : ''].filter(Boolean).join(' · '),
    amount: r.type === 'WITHDRAWAL' || r.type === 'TRANSFER_OUT' ? rupees(-total) : rupees(total),
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
  return `${total} ${total === 1 ? 'entry' : 'entries'} in this passbook${parts.length ? `: ${parts.join(', ')}` : ''}.`;
}

export const PENSION_NOTE = 'Pension figures are kept but not added to the balance.';

export const importableCount = (p: EpfPreview) => p.newCount + p.replacesCount;

/** "Northwind Labs · FY 2026-27"-style sub line: "Member ID …67890 · UAN …4321 · up to Sep 2026". */
export function employerSub(p: EpfPreview): string {
  const last = p.employer.throughMonth;
  return [
    p.employer.memberId ? `Member ID …${p.employer.memberId.slice(-5)}` : '',
    p.employer.uanLast4 ? `UAN …${p.employer.uanLast4}` : '',
    last ? `up to ${monthYear(last)}` : '',
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

export const resultTitle = (r: EpfImportResult) => {
  const n = r.imported + r.replaced;
  return `Imported ${n} ${n === 1 ? 'entry' : 'entries'}`;
};

/** "2 new and 1 replaced. EPF balance is now ₹8,43,210, up to Sep 2026." */
export const resultLine = (r: EpfImportResult) => {
  const parts = [`${r.imported} new`, ...(r.replaced > 0 ? [`${r.replaced} replaced`] : [])];
  const head = parts.join(' and ');
  const balance = `EPF balance is now ${rupees(r.balance)}${r.throughMonth ? `, up to ${monthYear(r.throughMonth)}` : ''}.`;
  return `${head.charAt(0).toUpperCase()}${head.slice(1)}. ${balance}`;
};
