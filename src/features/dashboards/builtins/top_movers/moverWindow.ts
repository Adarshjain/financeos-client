// The window line on a Top movers row. The one copy: the Legacy widget imports it too.

import { formatDate } from '@/lib/format';

import type { Mover } from './topMovers';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD → dd/mm (empty for anything else), as the Legacy date display. */
export const dayMonthNumeric = (iso: string): string => {
  const m = ISO_DAY.exec(iso);
  return m ? `${m[3]}/${m[2]}` : '';
};

/** YYYY-MM-DD → "8 Oct" (empty for anything else), as Dinero lists read dates. */
export const dayMonthShort = (iso: string): string => {
  return ISO_DAY.test(iso) ? formatDate(iso, 'list') : '';
};

/** "08/10 → 09/10" (or "8 Oct → 9 Oct" with `dayMonthShort`): the row's own previous close → latest price (when the rows' windows differ). */
export function moverWindow(mover: Mover, day: (iso: string) => string = dayMonthNumeric): string | null {
  if (!mover.previousCloseAsOf) return null;
  const to = mover.lastPriceAsOf ? day(mover.lastPriceAsOf) : null;
  return to ? `${day(mover.previousCloseAsOf)} → ${to}` : `since ${day(mover.previousCloseAsOf)}`;
}
