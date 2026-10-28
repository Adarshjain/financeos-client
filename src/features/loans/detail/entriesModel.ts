import { formatDate, formatMoney } from '@/lib/format';
import type {
  AdjustmentMode,
  LoanChargeResponse,
  LoanChargeType,
  LoanEventResponse,
  LoanEventType,
} from '@/lib/loan.types';

import { ratePct } from './loanDetailModel';

export const EVENT_TYPES: { value: LoanEventType; label: string }[] = [
  { value: 'rate_change', label: 'Rate change' },
  { value: 'prepayment', label: 'Prepayment' },
  { value: 'foreclosure', label: 'Foreclosure' },
];

export const CHARGE_TYPES: { value: LoanChargeType; label: string }[] = [
  { value: 'processing_fee', label: 'Processing fee' },
  { value: 'insurance_premium', label: 'Insurance premium' },
  { value: 'foreclosure_charge', label: 'Foreclosure charge' },
  { value: 'bounce_charge', label: 'Bounce charge' },
  { value: 'late_fee', label: 'Late fee' },
  { value: 'legal_valuation', label: 'Legal / valuation' },
  { value: 'other', label: 'Other' },
];

export const ADJUSTMENT_MODES: { value: AdjustmentMode; label: string }[] = [
  { value: 'reduce_tenure', label: 'Reduce tenure' },
  { value: 'reduce_emi', label: 'Reduce EMI' },
];

export function eventLabel(type: LoanEventType): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function chargeLabel(type: LoanChargeType): string {
  return CHARGE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface EntryRow {
  id: string;
  kind: 'event' | 'charge';
  /** "Rate change · 8.25%", "Prepayment", "Insurance premium". */
  title: string;
  /** "1 Aug 26 · reduce EMI", "1 Aug 25 · incl. GST". */
  subtitle: string;
  /** "₹2,00,000", or null (a rate change moves no money). */
  amount: string | null;
}

function eventRow(event: LoanEventResponse): EntryRow {
  const mode =
    event.eventType !== 'foreclosure' && event.adjustmentMode
      ? event.adjustmentMode === 'reduce_emi'
        ? 'reduce EMI'
        : 'reduce tenure'
      : null;
  const title =
    event.eventType === 'rate_change' && event.newAnnualRatePct != null
      ? `${eventLabel('rate_change')} · ${ratePct(event.newAnnualRatePct)}`
      : eventLabel(event.eventType);
  return {
    id: event.id,
    kind: 'event',
    title,
    subtitle: [formatDate(event.effectiveDate, 'list'), mode].filter(Boolean).join(' · '),
    amount: event.amount != null ? formatMoney(event.amount) : null,
  };
}

function chargeRow(charge: LoanChargeResponse): EntryRow {
  return {
    id: charge.id,
    kind: 'charge',
    title: chargeLabel(charge.chargeType),
    subtitle: [formatDate(charge.chargeDate, 'list'), charge.notes?.trim() || null].filter(Boolean).join(' · '),
    amount: formatMoney(charge.amount),
  };
}

/** Events newest first, then charges newest first: the rows of the Events & charges card. */
export function entryRows(events: LoanEventResponse[], charges: LoanChargeResponse[]): EntryRow[] {
  return [
    ...[...events].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).map(eventRow),
    ...[...charges].sort((a, b) => b.chargeDate.localeCompare(a.chargeDate)).map(chargeRow),
  ];
}

/** "4 entries", "1 entry", "No entries yet". */
export function entriesCount(n: number): string {
  if (n === 0) return 'No entries yet';
  return `${n} ${n === 1 ? 'entry' : 'entries'}`;
}

/** What the delete confirmation says goes and what stays. */
export function deleteEntryCopy(row: EntryRow): { title: string; description: string; impact: string[] } {
  if (row.kind === 'event') {
    return {
      title: 'Delete event',
      description: `Removes ${row.title}, ${row.subtitle}.`,
      impact: ['The schedule is calculated again without it.', 'A linked bank transaction stays; only the link goes.'],
    };
  }
  return {
    title: 'Delete charge',
    description: `Removes ${row.title}${row.amount ? ` of ${row.amount}` : ''}, ${row.subtitle}.`,
    impact: ['It no longer counts toward the loan\'s costs.', 'A linked bank transaction stays; only the link goes.'],
  };
}
