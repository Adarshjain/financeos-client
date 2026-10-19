import { plural } from '@/features/accounts/detail/overview/dates';
import { formatAmount, formatDayMonth, formatDayMonthYear, formatRupees } from '@/features/accounts/list/accountsList';
import { deletionImpactItems, deletionNote } from '@/features/accounts/statements/deletionImpact';
import type { CardBillResponse, Schemas } from '@/lib/api/types';

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
  credit: boolean;
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
  skippedBanner: string | null;
  lines: LineRowModel[];
  /** "Closing balance ₹44,319 · matches ledger"; null when the statement has no closing balance. */
  ledgerLine: string | null;
  isCard: boolean;
  /** The statement's current due date, to start the Set due date dialog from. */
  dueDate: string | null;
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

export function buildLineRow(line: StatementDetailData['lines'][number]): LineRowModel {
  const linked = line.origin !== 'created';
  const credit = line.type === 'CREDIT';
  const day = formatDayMonth(line.date);
  const how = credit ? 'credit' : linked ? 'linked to transaction' : 'created from this statement';
  return {
    id: line.transactionId,
    date: day,
    description: line.description ?? '',
    amount: `${credit ? '+' : ''}${formatAmount(line.amount)}`,
    credit,
    linked,
    phoneSub: `${day} · ${how}`,
  };
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
    subtitle.push(`Period ${formatDayMonth(detail.periodStart)} → ${formatDayMonth(detail.periodEnd)}`);
  }
  if (detail.source === 'file_upload' && detail.sourceRef) subtitle.push(detail.sourceRef);
  subtitle.push(`uploaded ${formatDayMonth(detail.createdAt.slice(0, 10))}`);

  const card = detail.cardDetails;
  const stats: StatStat[] = isCard
    ? [
        { label: 'Total due', value: money(card?.totalAmountDue ?? bill?.totalAmountDue) },
        { label: 'Minimum', value: money(card?.minimumAmountDue ?? bill?.minimumAmountDue) },
        { label: 'Paid so far', value: bill ? formatRupees(bill.paidAmount ?? 0) : '—' },
      ]
    : [
        { label: 'Opening', value: money(detail.openingBalance) },
        { label: 'Closing', value: money(detail.closingBalance) },
        { label: 'Lines', value: String(detail.transactionCount ?? detail.lines.length) },
      ];

  const skipped = detail.linesSkipped ?? 0;
  return {
    statementId: detail.id,
    periodEndLabel: formatDayMonthYear(end),
    title: `Statement · ${formatDayMonthYear(end)}`,
    subtitle,
    checksumOk: detail.checksumOk ?? null,
    stats,
    skippedBanner: skipped > 0 ? `${plural(skipped, 'line was', 'lines were')} skipped.` : null,
    lines: detail.lines.map(buildLineRow),
    ledgerLine: ledgerLine(detail.closingBalance, detail.matchesLedger, detail.ledgerBalanceAtClose),
    isCard,
    dueDate: bill?.paymentDueDate ?? card?.paymentDueDate ?? null,
    source: detail.source,
  };
}

/** The deletion preview's impact as plain bullet strings (shared wording). */
export function deletionImpact(preview: DeletionPreview): string[] {
  return deletionImpactItems(preview).map((i) => `${i.lead ?? ''}${i.text}`);
}

export { deletionNote };
