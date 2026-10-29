import { deletionImpactItems, deletionNote } from '@/features/accounts/statements/deletionImpactModel';
import type { CardBillResponse, Schemas } from '@/lib/api/types';
import { formatCount, formatDate, formatMoney, formatPercent } from '@/lib/format';

import { signedRupees, statementDate } from './listModel';

export type StatementDetailData = Schemas['StatementDetailResponse'];
export type DeletionPreview = Schemas['StatementDeletionPreviewResponse'];

export interface StatStat {
  label: string;
  value: string;
}

export interface LineRowModel {
  id: string;
  date: string;
  description: string;
  amount: string;
  /** The line's amount as a number, for the Amount figure. */
  value: number;
  credit: boolean;
  /** "1", "2": the line's position in the statement; "" when the server sent none. */
  index: string;
  /** Review status of the line; null when not applicable. */
  review: { label: string; tone: 'success' | 'warning' | 'info' } | null;
  /** Balance after this line, "—" when unknown. */
  balanceAfter: string;
  /** Does the running balance chain through this line? null when unknown. */
  chain: 'valid' | 'broken' | null;
  /** Linked to an existing transaction (true) or created from this statement (false). */
  linked: boolean;
  /** Phone second line: "9 Sep · linked to transaction". */
  phoneSub: string;
}

export interface StatementDetailModel {
  statementId: string;
  /** "5 Oct 2026". */
  periodEndLabel: string;
  title: string;
  /** Subtitle parts before the checksum word, joined with " · ". */
  subtitle: string[];
  checksumOk: boolean | null;
  stats: StatStat[];
  /** The rest of the statement's details (card figures, parse mode, chain validation, source). */
  details: StatStat[];
  skippedBanner: string | null;
  lines: LineRowModel[];
  /** "Closing balance ₹44,319 · matches ledger"; null when the statement has no closing balance. */
  ledgerLine: string | null;
  isCard: boolean;
  /** The statement's current values, to start the Edit details dialog from. */
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  totalDue: number | null;
  minimumDue: number | null;
  /** Codes of the details the statement lacks (cards only): PERIOD_END, DUE_DATE, TOTAL_DUE, MINIMUM_DUE. */
  missing: string[];
  /** "Missing from this statement: due date, total due."; null when nothing is missing. */
  missingBanner: string | null;
  source: 'gmail' | 'file_upload';
}

/** "Closing balance ₹x · matches ledger", or "· ledger ₹y" when the ledger disagrees. */
export function ledgerLine(
  closing: number | null | undefined,
  matchesLedger: boolean | null | undefined,
  ledger: number | null | undefined
): string | null {
  if (closing == null) return null;
  const base = `Closing balance ${signedRupees(closing)}`;
  if (matchesLedger === true) return `${base} · matches ledger`;
  if (matchesLedger === false && ledger != null) return `${base} · ledger ${signedRupees(ledger)}`;
  return base;
}

const REVIEW: Record<string, { label: string; tone: 'success' | 'warning' | 'info' }> = {
  AUTO_REVIEWED: { label: 'Auto reviewed', tone: 'success' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
  MANUALLY_REVIEWED: { label: 'Manually reviewed', tone: 'info' },
};

export function buildLineRow(line: StatementDetailData['lines'][number]): LineRowModel {
  const linked = line.origin !== 'created';
  const credit = line.type === 'CREDIT';
  const day = formatDate(line.date, 'list');
  const review = (line.reviewType && REVIEW[line.reviewType]) || null;
  const chain = line.chainValid == null ? null : line.chainValid ? 'valid' : 'broken';
  const balanceAfter = line.balanceAfter == null ? '—' : formatMoney(line.balanceAfter, { decimals: 'auto' });
  const how = credit ? 'credit' : linked ? 'linked to transaction' : 'created from this statement';
  return {
    id: line.transactionId,
    date: day,
    description: line.description ?? '',
    amount: `${credit ? '+' : ''}${formatMoney(line.amount, { decimals: 'exact', symbol: false })}`,
    value: line.amount,
    index: line.lineIndex == null ? '' : String(line.lineIndex + 1),
    review,
    balanceAfter,
    chain,
    credit,
    linked,
    phoneSub: line.balanceAfter == null ? `${day} · ${how}` : `${day} · ${how} · balance ${balanceAfter}`,
  };
}

/** The card statement's remaining figures, then parse mode, chain validation and source (all types); empty ones are left out. */
export function buildDetails(detail: StatementDetailData, isCard: boolean): StatStat[] {
  const card = detail.cardDetails;
  const out: StatStat[] = [];
  if (isCard && card) {
    out.push(
      { label: 'Due date', value: card.paymentDueDate ? formatDate(card.paymentDueDate, 'full') : '—' },
      { label: 'Credit limit', value: money(card.creditLimit) },
      { label: 'Available credit', value: money(card.availableCreditLimit) },
      { label: 'Finance charges', value: money(card.financeCharges) },
      { label: 'Fees and charges', value: money(card.feesAndCharges) },
      { label: 'Previous balance', value: money(card.previousBalance) },
      { label: 'Payments received', value: money(card.paymentsReceived) },
      { label: 'Total purchases', value: money(card.totalPurchases) },
      {
        label: 'Reward points balance',
        value: card.rewardPointsBalance == null ? '—' : formatCount(card.rewardPointsBalance),
      },
      {
        label: 'Points earned',
        value: card.rewardPointsEarned == null ? '—' : `+${formatCount(card.rewardPointsEarned)}`,
      }
    );
  }
  out.push(
    { label: 'Parse mode', value: detail.parseMode || 'Standard' },
    {
      label: 'Chain validation',
      value: detail.chainValidationPct == null ? 'N/A' : `${formatPercent(detail.chainValidationPct)} valid`,
    },
    { label: 'Ingestion source', value: detail.source === 'gmail' ? 'Gmail' : 'File upload' }
  );
  // A figure the statement doesn't carry is left out rather than shown as a dash.
  return out.filter((d) => d.value !== '—' && d.value !== 'N/A');
}

function money(value: number | null | undefined): string {
  return value == null ? '—' : signedRupees(value);
}

/** Everything the detail card shows for the selected statement. `bill` is its bill (cards only). */
export function buildDetailModel(
  detail: StatementDetailData,
  bill: CardBillResponse | null,
  isCard: boolean
): StatementDetailModel {
  const end = statementDate({ periodEnd: detail.periodEnd, createdAt: detail.createdAt });
  const subtitle: string[] = [];
  if (detail.periodStart && detail.periodEnd) {
    subtitle.push(`Period ${formatDate(detail.periodStart, 'list')} → ${formatDate(detail.periodEnd, 'list')}`);
  }
  if (detail.source === 'file_upload' && detail.sourceRef) subtitle.push(detail.sourceRef);
  subtitle.push(`uploaded ${formatDate(detail.createdAt.slice(0, 10), 'list')}`);

  const card = detail.cardDetails;
  const stats: StatStat[] = isCard
    ? [
        { label: 'Total due', value: money(card?.totalAmountDue ?? bill?.totalAmountDue) },
        { label: 'Minimum', value: money(card?.minimumAmountDue ?? bill?.minimumAmountDue) },
        { label: 'Paid so far', value: bill ? formatMoney(bill.paidAmount ?? 0, { decimals: 'auto' }) : '—' },
      ]
    : [
        { label: 'Opening', value: money(detail.openingBalance) },
        { label: 'Closing', value: money(detail.closingBalance) },
        { label: 'Lines', value: String(detail.transactionCount ?? detail.lines.length) },
      ];

  const skipped = detail.linesSkipped ?? 0;
  const missing = isCard ? (detail.missingDetails ?? []) : [];
  return {
    statementId: detail.id,
    periodEndLabel: formatDate(end, 'full'),
    title: `Statement · ${formatDate(end, 'full')}`,
    subtitle,
    checksumOk: detail.checksumOk ?? null,
    stats,
    details: buildDetails(detail, isCard),
    skippedBanner: skipped > 0 ? `${formatCount(skipped, ['line was', 'lines were'])} skipped.` : null,
    lines: detail.lines.map(buildLineRow),
    ledgerLine: ledgerLine(detail.closingBalance, detail.matchesLedger, detail.ledgerBalanceAtClose),
    isCard,
    periodStart: detail.periodStart ?? null,
    periodEnd: detail.periodEnd ?? null,
    dueDate: bill?.paymentDueDate ?? card?.paymentDueDate ?? null,
    totalDue: card?.totalAmountDue ?? bill?.totalAmountDue ?? null,
    minimumDue: card?.minimumAmountDue ?? bill?.minimumAmountDue ?? null,
    missing,
    missingBanner: missingBanner(missing),
    source: detail.source,
  };
}

const MISSING_WORDS: Record<string, string> = {
  PERIOD_END: 'period end',
  DUE_DATE: 'due date',
  TOTAL_DUE: 'total due',
  MINIMUM_DUE: 'minimum due',
};

/** "Missing from this statement: due date, total due."; null for an empty list. */
export function missingBanner(missing: readonly string[]): string | null {
  if (missing.length === 0) return null;
  return `Missing from this statement: ${missing.map((m) => MISSING_WORDS[m] ?? m.toLowerCase()).join(', ')}.`;
}

/** The deletion preview's impact as plain bullet strings (shared wording). */
export function deletionImpact(preview: DeletionPreview): string[] {
  return deletionImpactItems(preview).map((i) => `${i.lead ?? ''}${i.text}`);
}

export { deletionNote };

export type DetailsField =
  | 'periodStart'
  | 'periodEnd'
  | 'dueDate'
  | 'totalDue'
  | 'minimumDue';

/** The Edit details form: dates as yyyy-mm-dd, amounts as typed; '' is empty. */
export type DetailsForm = Record<DetailsField, string>;

export interface DetailsValues {
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  totalDue: number | null;
  minimumDue: number | null;
}

export type DetailsErrors = Partial<Record<DetailsField | 'form', string>>;

const FIELD_NAMES: Record<DetailsField, string> = {
  periodStart: 'period start',
  periodEnd: 'period end',
  dueDate: 'due date',
  totalDue: 'total due',
  minimumDue: 'minimum due',
};

export function detailsFormFrom(v: DetailsValues): DetailsForm {
  return {
    periodStart: v.periodStart ?? '',
    periodEnd: v.periodEnd ?? '',
    dueDate: v.dueDate ?? '',
    totalDue: v.totalDue == null ? '' : String(v.totalDue),
    minimumDue: v.minimumDue == null ? '' : String(v.minimumDue),
  };
}

const DAY_MS = 86_400_000;
function dayNumber(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

/**
 * The fields that differ from the statement, as the PATCH body (only these are sent), plus the
 * errors blocking the save. Mirrors the server: a rule is checked only when a field it involves
 * changed, on the merged values; a field that had a value cannot be cleared.
 */
export function checkDetails(
  form: DetailsForm,
  initial: DetailsValues
): { body: Record<string, string | number>; errors: DetailsErrors } {
  const errors: DetailsErrors = {};
  const body: Record<string, string | number> = {};
  const was = detailsFormFrom(initial);
  const changed = (f: DetailsField) =>
    form[f] !== was[f] && !(form[f] === '' && was[f] === '');

  (Object.keys(FIELD_NAMES) as DetailsField[]).forEach((f) => {
    if (!changed(f)) return;
    if (form[f] === '') {
      errors[f] = `Enter the ${FIELD_NAMES[f]}.`;
      return;
    }
    if (f === 'totalDue' || f === 'minimumDue') {
      const n = Number(form[f]);
      if (!Number.isFinite(n)) errors[f] = `Enter the ${FIELD_NAMES[f]}`;
      else if (n < 0)
        errors[f] =
          f === 'totalDue'
            ? 'Enter a total due of ₹0 or more.'
            : 'Enter a minimum due of ₹0 or more.';
      else body[f === 'totalDue' ? 'totalAmountDue' : 'minimumAmountDue'] = n;
    } else {
      body[f === 'dueDate' ? 'paymentDueDate' : f] = form[f];
    }
  });

  const start = form.periodStart;
  const end = form.periodEnd;
  const startOrEndChanged = changed('periodStart') || changed('periodEnd');
  if (startOrEndChanged && start && end) {
    const field: DetailsField = changed('periodEnd')
      ? 'periodEnd'
      : 'periodStart';
    const days = dayNumber(end) - dayNumber(start);
    if (days < 0)
      errors[field] ??= 'Enter a period start on or before the period end.';
    else if (days > 400)
      errors[field] ??= 'Enter a statement period of 400 days or less.';
  }
  if ((changed('dueDate') || changed('periodEnd')) && form.dueDate && end) {
    const days = dayNumber(form.dueDate) - dayNumber(end);
    if (days < 0 || days > 60)
      errors.dueDate ??= 'Enter a due date 0 to 60 days after the period end.';
  }
  if (
    (changed('totalDue') || changed('minimumDue')) &&
    form.totalDue !== '' &&
    form.minimumDue !== ''
  ) {
    if (Number(form.minimumDue) > Number(form.totalDue))
      errors.minimumDue ??= 'Enter a minimum due that is not above the total due.';
  }

  if (Object.keys(errors).length === 0 && Object.keys(body).length === 0) {
    errors.form = 'Change at least one of the fields';
  }
  return { body, errors };
}
