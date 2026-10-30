'use client';

// Presentational parts of the tax_harvest widget: the LTCG exemption bar, the raw booked equity P&L by term
// (each figure opens its realised lots), the figures after the pooled set-off, the harvesting summary lines
// and one open lot.

import { Button } from '@/components/ds/Button/Button';
import { ListField } from '@/components/ds/ListField/ListField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { Text } from '@/components/ds/Text/Text';
import { moveTone } from '@/features/investments/investmentsFormatModel';
import { formatCount, formatDate, formatMoney, pluralize } from '@/lib/format';
import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';

/** ₹1,25,000 → "₹1.25L"; other limits in full. */
function lakhs(value: number): string {
  if (value >= 1e5 && value % 1000 === 0) return formatMoney(value, { compact: true });
  return formatMoney(value);
}

/** "₹77,000 left" over a bar of the used share, with "₹48,000 used of ₹1.25L" beneath. */
export function ExemptionBar({ realised }: { realised: TaxHarvestResponse['realised'] }) {
  const limit = realised.exemptionLimit;
  const pct = limit > 0 ? (realised.exemptionUsed / limit) * 100 : 0;
  return (
    <div className="flex flex-col gap-space-8" data-testid="ltcg-exemption">
      <div className="flex items-baseline justify-between gap-space-8">
        <Text variant="body">LTCG exemption</Text>
        <Text variant="body-strong">{`${formatMoney(realised.exemptionLeft)} left`}</Text>
      </div>
      <ProgressBar
        value={Math.max(0, Math.min(100, pct))}
        label={`${formatMoney(realised.exemptionUsed)} used of ${lakhs(limit)}`}
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
    <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
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
          {formatMoney(value, { sign: 'always' })}
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
      <ListField label="Net short-term after set-off" value={formatMoney(realised.netStcg, { sign: 'always' })} />
      <ListField label="Net long-term after set-off" value={formatMoney(realised.netLtcg, { sign: 'always' })} />
      {/* The exemption applies to the equity part only; shown when other-class LTCG is in the net. */}
      {realised.netEquityLtcg !== realised.netLtcg && (
        <ListField label="Equity LTCG after set-off" value={formatMoney(realised.netEquityLtcg, { sign: 'always' })} />
      )}
      <ListField label="Taxable LTCG" value={formatMoney(realised.taxableLtcg)} />
      {realised.stclCarriedForward > 0 && (
        <ListField label="Short-term losses carried forward" value={formatMoney(realised.stclCarriedForward)} />
      )}
      {realised.ltclCarriedForward > 0 && (
        <ListField label="Long-term losses carried forward" value={formatMoney(realised.ltclCarriedForward)} />
      )}
      {realised.slabGains !== 0 && <ListField label="Slab-rate gains booked" value={formatMoney(realised.slabGains, { sign: 'always' })} />}
      {/* Gold, international, older debt…: raw by term; their lots are not in the equity drills. */}
      {realised.otherGains.total !== 0 && (
        <ListField
          label="Other assets (gold, international, debt)"
          value={`ST ${formatMoney(realised.otherGains.shortTerm, { sign: 'always' })} · LT ${formatMoney(realised.otherGains.longTerm, { sign: 'always' })}`}
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
        value={<Text variant="body-strong" tone="positive">{formatMoney(summary.harvestableLtcg)}</Text>}
      />
      {soon.count > 0 && (
        <ListField
          label={`${formatCount(soon.count)} ${pluralize(soon.count, 'lot turns', 'lots turn')} long-term in ${formatCount(soon.withinDays, ['day', 'days'])}`}
          value={formatMoney(soon.gain, { sign: 'always' })}
        />
      )}
      {losses < 0 && (
        <ListField
          label="Losses you could book"
          value={<Text variant="body-strong" tone="danger">{formatMoney(losses, { sign: 'always' })}</Text>}
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
    ? `Long-term on ${formatDate(lot.longTermOn as string, 'list')} · ${formatCount(lot.daysToLongTerm, ['day', 'days'])}`
    : `Bought ${formatDate(lot.buyDate, 'list')}`;
  return (
    <ListRow
      onClick={() => onOpen(lot)}
      title={lot.instrument}
      subtitle={`${TERM_LABEL[lot.term] ?? lot.term} · ${when}${lot.grandfathered ? ' · cost may be higher' : ''}`}
      trailing={<Text variant="body-strong" tone={moveTone(lot.gain) ?? 'ink'}>{formatMoney(lot.gain, { sign: 'always' })}</Text>}
    />
  );
}
