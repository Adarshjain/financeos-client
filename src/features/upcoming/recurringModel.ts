import type { RecurringSeriesDto } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

import type { LoanFormValues } from '../loans/loanFormModel';

export const PERIOD_WORDS: Record<RecurringSeriesDto['period'], string> = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'every 3 months',
  YEARLY: 'yearly',
};

export const KIND_WORDS: Record<RecurringSeriesDto['kind'], string> = {
  SUBSCRIPTION: 'Subscription',
  EMI: 'EMI',
  OTHER: 'Regular payment',
};

/** "₹649 monthly · 6 payments · last 12 Oct · HDFC Regalia". */
export function proposalLine(p: RecurringSeriesDto): string {
  return [
    `${formatMoney(p.amount, { decimals: 'exact' })} ${PERIOD_WORDS[p.period]}`,
    `${p.paymentCount} payments`,
    `last ${formatDate(p.lastPaidOn, 'list')}`,
    p.accountName || null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The Add loan fields a proposal can fill; the form has no EMI-day field, so the first payment date carries it. */
export function loanPrefillValues(p: RecurringSeriesDto): Partial<LoanFormValues> {
  const pre = p.loanPrefill;
  if (!pre) return { name: p.displayName, emiAmount: String(p.amount) };
  return {
    name: pre.name,
    emiAmount: String(pre.emiAmount),
    ...(pre.firstPaymentGuess ? { firstEmiDate: pre.firstPaymentGuess } : {}),
    ...(pre.accountId ? { paymentAccountId: pre.accountId } : {}),
  };
}
