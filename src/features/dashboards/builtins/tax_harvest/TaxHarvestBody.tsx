'use client';

// tax_harvest: this financial year's booked gains against the LTCG exemption (₹1.25L; ₹1L before FY 2024-25),
// what the open lots offer (tax-free LTCG, lots turning long term soon, losses to book) and the top open lots by
// gain. The raw equity P&L by term opens its realised lots (the figure equals the drill); the after-set-off
// figures are plain. A lot opens its holding's breakdown. Not tax advice. Content only; the frame draws the card.

import React from 'react';

import { EmptyState, Skeleton, Text } from '@/components/ds';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { formatMoney } from '@/lib/format';
import { useTaxHarvest } from '@/lib/query/hooks/useInvestments';
import type { TaxHarvestLot } from '@/lib/taxHarvest.types';

import { bookedGainsRequest } from '../investmentsLoansData';
import { BodyError, LazyReportUnderlyingDialog } from '../investmentsLoansParts';
import { bookedFigure, lotKeys, TAX_HARVEST_LOTS, TERM_TITLE } from './taxHarvest';
import { BookedGains, ExemptionBar, HarvestLines, LotRow } from './TaxHarvestParts';

/** The widget's loading skeleton: the exemption bar, the two booked figures, a few lines and lots. */
export function TaxHarvestSkeleton() {
  return (
    <div data-testid="tax-harvest-loading">
      <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 pb-space-12">
        <Skeleton width="100%" height={22} />
        <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
          <Skeleton height={32} />
          <Skeleton height={32} />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-space-12 px-space-16 py-space-8">
          <Skeleton width="45%" />
          <Skeleton width="20%" />
        </div>
      ))}
    </div>
  );
}

export function TaxHarvestBody() {
  const { data, isLoading, error, refetch } = useTaxHarvest({ page: 0, size: TAX_HARVEST_LOTS });
  const [booked, setBooked] = React.useState<'short' | 'long' | null>(null);
  const [lot, setLot] = React.useState<TaxHarvestLot | null>(null);
  const bookedRequest = React.useMemo(() => (booked ? bookedGainsRequest(booked) : null), [booked]);

  if (isLoading) return <TaxHarvestSkeleton />;
  if (error) return <BodyError what="your capital gains" error={error} retry={() => void refetch()} />;
  if (!data) return <EmptyState compact title="Nothing to show yet" />;

  const lots = data.openLots.items;
  const keys = lotKeys(lots);
  return (
    <div data-testid="tax-harvest-widget">
      <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 pb-space-8">
        <ExemptionBar realised={data.realised} />
        <BookedGains realised={data.realised} onOpen={setBooked} />
      </div>
      <HarvestLines data={data} />
      {lots.length > 0 && (
        <div role="list" aria-label="Open lots">
          {lots.map((l, i) => (
            <div key={keys[i]} role="listitem">
              <LotRow lot={l} onOpen={setLot} />
            </div>
          ))}
        </div>
      )}
      <div className="px-space-16 py-space-8">
        <Text variant="caption" tone="ink-3" as="p">Not tax advice</Text>
      </div>
      {lot && <LazyReportRowBreakdownDialog datasource="positions" rowId={lot.holdingId} title={lot.instrument} onClose={() => setLot(null)} />}
      {bookedRequest && booked && (
        <LazyReportUnderlyingDialog
          request={bookedRequest}
          title={`${TERM_TITLE[booked]} · ${formatMoney(bookedFigure(data.realised, booked), { sign: 'always' })}`}
          onClose={() => setBooked(null)}
        />
      )}
    </div>
  );
}
