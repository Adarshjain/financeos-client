// Pure helpers behind the tax_harvest widget (moved from the Legacy widget, which imports them back).

import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';

/** Open lots the widget lists (the server pages them, largest gain first). */
export const TAX_HARVEST_LOTS = 5;

/**
 * Stable, unique keys for the listed lots: holding, buy date and quantity,
 * plus an occurrence index when one holding has identical lots.
 */
export function lotKeys(lots: readonly TaxHarvestLot[]): string[] {
  const seen = new Map<string, number>();
  return lots.map((l) => {
    const base = `${l.holdingId}:${l.buyDate}:${l.quantity}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `${base}:${n}`;
  });
}

/** The drill dialog's title lead per term (the figure follows it). */
export const TERM_TITLE = { short: 'Equity short-term P&L this FY', long: 'Equity long-term P&L this FY' } as const;

/** The raw booked equity P&L for one term: gains minus losses (what the drill's lots sum to). */
export function bookedFigure(realised: TaxHarvestResponse['realised'], term: 'short' | 'long'): number {
  return term === 'short' ? realised.stcg - realised.stcl : realised.ltcg - realised.ltcl;
}
