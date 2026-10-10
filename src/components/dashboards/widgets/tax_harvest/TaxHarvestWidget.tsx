'use client';

// tax_harvest: this financial year's booked gains against the LTCG exemption
// (₹1.25L; ₹1L before FY 2024-25), what the open lots offer (tax-free LTCG,
// lots turning long term soon, losses to book) and the top open lots by gain.
// The raw equity P&L by term opens its realised lots (the figure equals the
// drill); the after-set-off figures are plain. A lot opens its holding's
// breakdown. Not tax advice.

import { Receipt } from 'lucide-react';
import { useState } from 'react';

import { LazyKpiUnderlyingDialog, LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { useTaxHarvest } from '@/lib/query/hooks/useInvestments';
import type { TaxHarvestLot } from '@/lib/taxHarvest.types';

import {
  bookedGainsRequest,
  WidgetBody,
  WidgetEmpty,
  WidgetLoadError,
  WidgetLoadingRows,
} from '../investmentsLoansKit/kit';
import { BookedGains, ExemptionBar, HarvestLines, LotRow } from './TaxHarvestParts';

/** Open lots the widget lists (the server pages them, largest gain first). */
export const TAX_HARVEST_LOTS = 5;

const TERM_TITLE = { short: 'Equity short-term P&L this FY', long: 'Equity long-term P&L this FY' } as const;

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

export function TaxHarvestWidget({ className }: { className?: string }) {
  const { data, isLoading, error } = useTaxHarvest({ page: 0, size: TAX_HARVEST_LOTS });
  const [booked, setBooked] = useState<'short' | 'long' | null>(null);
  const [lot, setLot] = useState<TaxHarvestLot | null>(null);

  let body;
  if (isLoading) body = <WidgetLoadingRows testId="tax-harvest-loading" />;
  else if (error) body = <WidgetLoadError what="your capital gains" error={error} />;
  else if (!data) body = <WidgetEmpty icon={Receipt} title="Nothing to show yet" />;
  else {
    const lots = data.openLots.items;
    const keys = lotKeys(lots);
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 pb-2">
          <ExemptionBar realised={data.realised} />
          <BookedGains realised={data.realised} onOpen={setBooked} />
          <HarvestLines data={data} />
        </div>
        {lots.length > 0 && (
          <ul
            className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800"
            aria-label="Open lots"
          >
            {lots.map((l, i) => (
              <LotRow key={keys[i]} lot={l} onOpen={() => setLot(l)} />
            ))}
          </ul>
        )}
        <p className="px-4 py-2 text-2xs text-slate-500 dark:text-slate-400">Not tax advice</p>
      </div>
    );
  }

  return (
    <WidgetBody className={className} testId="tax-harvest-widget">
      {body}
      {booked && (
        <LazyKpiUnderlyingDialog
          source={{ kind: 'adhoc', request: bookedGainsRequest(booked) }}
          title={TERM_TITLE[booked]}
          open
          onOpenChange={(o) => !o && setBooked(null)}
        />
      )}
      {lot && (
        <LazyRowBreakdownDialog
          datasource="positions"
          rowId={lot.holdingId}
          title={lot.instrument}
          open
          onOpenChange={(o) => !o && setLot(null)}
        />
      )}
    </WidgetBody>
  );
}
