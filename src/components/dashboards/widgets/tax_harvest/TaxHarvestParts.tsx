'use client';

// Presentational parts of the tax_harvest widget: the LTCG exemption bar, the
// raw booked equity P&L by term (tappable: each equals its drill), the figures
// after the pooled set-off (plain), the harvesting summary lines and one open lot.

import type { TaxHarvestLot, TaxHarvestResponse } from '@/lib/taxHarvest.types';
import { cn } from '@/lib/utils';

import { DrillValue, fullDate, gainTone, ProgressBar, rupees, signedRupees } from '../investmentsLoansKit/kit';

const muted = 'text-slate-500 dark:text-slate-400';

/** "₹48,000 used · ₹77,000 left of ₹1.25L" with a bar of the used share. */
export function ExemptionBar({ realised }: { realised: TaxHarvestResponse['realised'] }) {
  const limit = realised.exemptionLimit;
  const pct = limit > 0 ? (realised.exemptionUsed / limit) * 100 : 0;
  return (
    <div className="space-y-1" data-testid="ltcg-exemption">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-700 dark:text-slate-200">LTCG exemption</span>
        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
          {rupees(realised.exemptionLeft)} left
        </span>
      </div>
      <ProgressBar pct={pct} label="LTCG exemption used" />
      <p className={cn('text-2xs tabular-nums', muted)}>
        {rupees(realised.exemptionUsed)} used of {lakhs(limit)}
      </p>
    </div>
  );
}

/** ₹1,25,000 → "₹1.25L"; other limits in full. */
function lakhs(value: number): string {
  if (value >= 1e5 && value % 1000 === 0) return `₹${Number((value / 1e5).toFixed(2))}L`;
  return rupees(value);
}

/**
 * Equity-oriented P&L booked this year by term, before any set-off: gains minus
 * losses (signed). Each figure is exactly the sum of the realised lots its tap
 * opens (realized_lots · this FY · term · equity-oriented).
 */
export function BookedGains({
  realised,
  onOpen,
}: {
  realised: TaxHarvestResponse['realised'];
  onOpen: (term: 'short' | 'long') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Booked label="Short-term P&L" value={realised.stcg - realised.stcl} onClick={() => onOpen('short')} />
      <Booked label="Long-term P&L" value={realised.ltcg - realised.ltcl} onClick={() => onOpen('long')} />
    </div>
  );
}

function Booked({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <div className="min-w-0">
      <p className={cn('truncate text-2xs', muted)}>{label}</p>
      <DrillValue
        onClick={onClick}
        label={`view underlying data for ${label}`}
        className={cn('text-sm font-semibold', gainTone(value))}
      >
        {signedRupees(value)}
      </DrillValue>
    </div>
  );
}

/**
 * The year after the pooled set-off (all classes; see TaxHarvestResponse):
 * net short and long term, taxable LTCG and losses carried forward — plain
 * lines, since no single list of lots adds up to them. Then the raw slab and
 * other-asset figures, and what today's open lots offer (current FY only:
 * `summary` is null for a past year).
 */
export function HarvestLines({ data }: { data: TaxHarvestResponse }) {
  const { realised, summary } = data;
  return (
    <dl className="space-y-1 text-xs" aria-label="After set-off">
      <Line label="Net short-term after set-off" value={signedRupees(realised.netStcg)} />
      <Line label="Net long-term after set-off" value={signedRupees(realised.netLtcg)} />
      {/* The exemption applies to the equity part only; shown when other-class LTCG is in the net. */}
      {realised.netEquityLtcg !== realised.netLtcg && (
        <Line label="Equity LTCG after set-off" value={signedRupees(realised.netEquityLtcg)} />
      )}
      <Line label="Taxable LTCG" value={rupees(realised.taxableLtcg)} />
      {realised.stclCarriedForward > 0 && (
        <Line label="Short-term losses carried forward" value={rupees(realised.stclCarriedForward)} />
      )}
      {realised.ltclCarriedForward > 0 && (
        <Line label="Long-term losses carried forward" value={rupees(realised.ltclCarriedForward)} />
      )}
      {realised.slabGains !== 0 && <Line label="Slab-rate gains booked" value={signedRupees(realised.slabGains)} />}
      {/* Gold, international, older debt…: raw by term; their lots are not in the equity drills. */}
      {realised.otherGains.total !== 0 && (
        <Line
          label="Other assets (gold, international, debt)"
          value={`ST ${signedRupees(realised.otherGains.shortTerm)} · LT ${signedRupees(realised.otherGains.longTerm)}`}
        />
      )}
      {summary && <SummaryLines summary={summary} />}
    </dl>
  );
}

/** Harvestable LTCG, lots turning long term soon, harvestable losses. */
function SummaryLines({ summary }: { summary: NonNullable<TaxHarvestResponse['summary']> }) {
  const soon = summary.turningLongTermSoon;
  const losses = summary.harvestableLosses.total;
  return (
    <>
      <Line label="LTCG you could book tax-free" value={rupees(summary.harvestableLtcg)} tone="text-emerald-600 dark:text-emerald-400" />
      {soon.count > 0 && (
        <Line
          label={`${soon.count} ${soon.count === 1 ? 'lot turns' : 'lots turn'} long-term in ${soon.withinDays} days`}
          value={signedRupees(soon.gain)}
        />
      )}
      {losses < 0 && <Line label="Losses you could book" value={signedRupees(losses)} tone="text-rose-600 dark:text-rose-400" />}
    </>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn('min-w-0', muted)}>{label}</dt>
      <dd className={cn('shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white', tone)}>{value}</dd>
    </div>
  );
}

const TERM_LABEL: Record<string, string> = { short: 'Short', long: 'Long', slab: 'Slab' };

/** One open lot: instrument, term chip, gain, when it turns long term, and the grandfathering caveat. */
export function LotRow({ lot, onOpen }: { lot: TaxHarvestLot; onOpen: () => void }) {
  const waiting = lot.daysToLongTerm != null && lot.daysToLongTerm > 0 && lot.longTermOn;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{lot.instrument}</span>
            <span className="shrink-0 rounded border border-slate-200 px-1 text-2xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {TERM_LABEL[lot.term] ?? lot.term}
            </span>
          </span>
          <span className={cn('block truncate text-2xs', muted)}>
            {waiting
              ? `Long-term on ${fullDate(lot.longTermOn)} · ${lot.daysToLongTerm} ${lot.daysToLongTerm === 1 ? 'day' : 'days'}`
              : `Bought ${fullDate(lot.buyDate)}`}
            {lot.grandfathered && ' · cost may be higher'}
          </span>
        </span>
        <span className={cn('shrink-0 text-xs font-semibold tabular-nums', gainTone(lot.gain))}>
          {signedRupees(lot.gain)}
        </span>
      </button>
    </li>
  );
}
