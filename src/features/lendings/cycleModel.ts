import { formatDate } from '@/lib/format';
import type { LendingCycleResponse } from '@/lib/lending.types';

/** "Cycle 3 · from 6 Oct 26" (open), "Cycle 2 · 12 Aug 26 – 4 Oct 26" (settled), "Cycle 2 · 12 Aug 26" (one day). */
export function cycleLabel(cycle: Pick<LendingCycleResponse, 'number' | 'startDate' | 'endDate' | 'settled'>): string {
  const start = formatDate(cycle.startDate, 'full');
  if (!cycle.settled) return `Cycle ${cycle.number} · from ${start}`;
  const end = formatDate(cycle.endDate, 'full');
  return `Cycle ${cycle.number} · ${start === end ? start : `${start} – ${end}`}`;
}
