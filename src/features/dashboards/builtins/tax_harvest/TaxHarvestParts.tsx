'use client';

// Presentational parts of the tax_harvest widget: the LTCG exemption bar, the raw booked equity P&L by term
// (each figure opens its realised lots), the figures after the pooled set-off, the harvesting summary lines
// and one open lot.

import { Button, ListField, ListRow, ProgressBar, Text } from '@/components/ds';
import { moveTone, rupees, shortDate, signedRupees } from '@/features/investments/investmentsFormat';
import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';

/** ₹1,25,000 → "₹1.25L"; other limits in full. */
function lakhs(value: number): string {
  if (value >= 1e5 && value % 1000 === 0) return `₹${Number((value / 1e5).toFixed(2))}L`;
  return rupees(value);
}

/** "₹77,000 left" over a bar of the used share, with "₹48,000 used of ₹1.25L" beneath. */
export function ExemptionBar({ realised }: { realised: TaxHarvestResponse['realised'] }) {
  const limit = realised.exemptionLimit;
  const pct = limit > 0 ? (realised.exemptionUsed / limit) * 100 : 0;
  return (
    <div className="flex flex-col gap-space-8" data-testid="ltcg-exemption">
      <div className="flex items-baseline justify-between gap-space-8">
        <Text variant="body">LTCG exemption</Text>
        <Text variant="body-strong">{`${rupees(realised.exemptionLeft)} left`}</Text>
      </div>
      <ProgressBar
        value={Math.max(0, Math.min(100, pct))}
        label={`${rupees(realised.exemptionUsed)} used of ${lakhs(limit)}`}
      />
    </div>
  );
}

/**
 * Equity-oriented P&L booked this year by term, before any set-off: gains minus losses (signed). Each figure is
 * exactly the sum of the realised lots its tap opens (realized_lots · this FY · term · equity-oriented).
 */
export function BookedGains({
  realised,
  onOpen,
}: {
  realised: TaxHarvestResponse['realised'];
  onOpen: (term: 'short' | 'long') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-space-12">
      <Booked label="Short-term P&L" value={realised.stcg - realised.stcl} onClick={() => onOpen('short')} />
      <Booked label="Long-term P&L" value={realised.ltcg - realised.ltcl} onClick={() => onOpen('long')} />
    </div>
  );
}

function Booked({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <div className="min-w-0">
      <Text variant="caption" tone="ink-3" as="div" truncate>{label}</Text>
      <Text variant="body-strong" tone={moveTone(value) ?? 'ink'} as="div">
        <Button variant="link" onClick={onClick} title={`View underlying data for ${label}`}>
          {signedRupees(value)}
        </Button>
      </Text>
    </div>
  );
}

/**
 * The year after the pooled set-off (all classes; see TaxHarvestResponse): net short and long term, taxable LTCG
 * and losses carried forward, plain lines since no single list of lots adds up to them. Then the raw slab and
 * other-asset figures, and what today's open lots offer (current FY only: `summary` is null for a past year).
 */
export function HarvestLines({ data }: { data: TaxHarvestResponse }) {
  const { realised, summary } = data;
  return (
    <div role="group" aria-label="After set-off">
      <ListField label="Net short-term after set-off" value={signedRupees(realised.netStcg)} />
      <ListField label="Net long-term after set-off" value={signedRupees(realised.netLtcg)} />
      {/* The exemption applies to the equity part only; shown when other-class LTCG is in the net. */}
      {realised.netEquityLtcg !== realised.netLtcg && (
        <ListField label="Equity LTCG after set-off" value={signedRupees(realised.netEquityLtcg)} />
      )}
      <ListField label="Taxable LTCG" value={rupees(realised.taxableLtcg)} />
      {realised.stclCarriedForward > 0 && (
        <ListField label="Short-term losses carried forward" value={rupees(realised.stclCarriedForward)} />
      )}
      {realised.ltclCarriedForward > 0 && (
        <ListField label="Long-term losses carried forward" value={rupees(realised.ltclCarriedForward)} />
      )}
      {realised.slabGains !== 0 && <ListField label="Slab-rate gains booked" value={signedRupees(realised.slabGains)} />}
      {/* Gold, international, older debt…: raw by term; their lots are not in the equity drills. */}
      {realised.otherGains.total !== 0 && (
        <ListField
          label="Other assets (gold, international, debt)"
          value={`ST ${signedRupees(realised.otherGains.shortTerm)} · LT ${signedRupees(realised.otherGains.longTerm)}`}
        />
      )}
      {summary && <SummaryLines summary={summary} />}
    </div>
  );
}

/** Harvestable LTCG, lots turning long term soon, harvestable losses. */
function SummaryLines({ summary }: { summary: NonNullable<TaxHarvestResponse['summary']> }) {
  const soon = summary.turningLongTermSoon;
  const losses = summary.harvestableLosses.total;
  return (
    <>
      <ListField
        label="LTCG you could book tax-free"
        value={<Text variant="body-strong" tone="positive">{rupees(summary.harvestableLtcg)}</Text>}
      />
      {soon.count > 0 && (
        <ListField
          label={`${soon.count} ${soon.count === 1 ? 'lot turns' : 'lots turn'} long-term in ${soon.withinDays} days`}
          value={signedRupees(soon.gain)}
        />
      )}
      {losses < 0 && (
        <ListField
          label="Losses you could book"
          value={<Text variant="body-strong" tone="danger">{signedRupees(losses)}</Text>}
        />
      )}
    </>
  );
}

const TERM_LABEL: Record<string, string> = { short: 'Short term', long: 'Long term', slab: 'Slab' };

/** One open lot: instrument, term, gain, when it turns long term, and the grandfathering caveat; opens the holding's breakdown. */
export function LotRow({ lot, onOpen }: { lot: TaxHarvestLot; onOpen: (lot: TaxHarvestLot) => void }) {
  const waiting = lot.daysToLongTerm != null && lot.daysToLongTerm > 0 && lot.longTermOn;
  const when = waiting
    ? `Long-term on ${shortDate(lot.longTermOn as string)} · ${lot.daysToLongTerm} ${lot.daysToLongTerm === 1 ? 'day' : 'days'}`
    : `Bought ${shortDate(lot.buyDate)}`;
  return (
    <ListRow
      onClick={() => onOpen(lot)}
      title={lot.instrument}
      subtitle={`${TERM_LABEL[lot.term] ?? lot.term} · ${when}${lot.grandfathered ? ' · cost may be higher' : ''}`}
      trailing={<Text variant="body-strong" tone={moveTone(lot.gain) ?? 'ink'}>{signedRupees(lot.gain)}</Text>}
    />
  );
}
