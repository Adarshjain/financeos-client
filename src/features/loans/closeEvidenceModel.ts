import type { LoanCloseEvidence } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

/** "1 day" / "12 days". */
function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/**
 * The facts behind "Is this loan closed?", one line each: the oldest EMI with no payment, the last payment,
 * and how much of the loan is paid. Empty when the server sent none.
 */
export function closeEvidenceLines(evidence: LoanCloseEvidence | null | undefined): string[] {
  if (!evidence) return [];
  const lines: string[] = [];
  lines.push(
    `EMI #${evidence.oldestUnpaidSeq} was due on ${formatDate(evidence.oldestUnpaidDueDate, 'list')} and has no payment for ${days(Math.max(0, evidence.daysOverdue))}.`,
  );
  lines.push(
    evidence.lastPaymentDate
      ? evidence.lastPaymentAmount != null
        ? `Last payment ${formatMoney(evidence.lastPaymentAmount, { decimals: 'auto' })} on ${formatDate(evidence.lastPaymentDate, 'list')}.`
        : `Last payment on ${formatDate(evidence.lastPaymentDate, 'list')}.`
      : 'No payment recorded yet.',
  );
  lines.push(
    `${evidence.settledInstallments} of ${evidence.totalInstallments} EMIs paid · ${formatMoney(evidence.outstandingPrincipal, { decimals: 'auto' })} principal left.`,
  );
  return lines;
}
