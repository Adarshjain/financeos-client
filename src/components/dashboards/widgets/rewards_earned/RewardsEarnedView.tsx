'use client';

// rewards_earned (view `rewards_fy`): rewards earned this financial year — a
// rupee headline (cashback + valued points) and one line per card in its own
// unit ("42,300 pts ≈ ₹14,100", "₹3,240", or "18,000 pts · Set value" linking
// to the card's reward settings). The headline and each card's rupee figure
// open their reward lines ("View underlying data" over reward_earnings);
// unvalued points are not tappable (their drill would read ₹0).

import { Gift } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { TemplateViewProps } from '@/components/dashboards/builtins/registry';
import { LazyKpiUnderlyingDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { EmptyState } from '@/components/ui/empty-state';
import { widgetTitle } from '@/lib/dashboards.helpers';
import { buildFilter, isPivotTableData } from '@/lib/reports.helpers';
import type { RunReportRequest } from '@/lib/reports.types';

import { adhocKpi, DrillValue, formatCount, formatRupees, ListPager, WidgetNote } from '../cards_spending_kit/kit';
import { buildRewardsEarned, type RewardCardRow } from './rewardsEarned.model';

/** Reward value earned this FY, optionally on one card. */
export function rewardsRequest(cardId: string | null): RunReportRequest {
  const filters = [buildFilter('effectiveDate', 'current_fy')];
  if (cardId) filters.push(buildFilter('card', 'is', cardId));
  return adhocKpi('reward_earnings', 'valueInr', filters);
}

/** The card's earnings in its own unit. */
export function nativeText(row: RewardCardRow): string {
  const parts: string[] = [];
  if (row.points > 0) {
    parts.push(row.unvalued ? `${formatCount(row.points)} pts` : `${formatCount(row.points)} pts ≈ ${formatRupees(row.pointsValue)}`);
  }
  if (row.cash > 0 || parts.length === 0) parts.push(formatRupees(row.cash));
  return parts.join(' + ');
}

const figureClass = 'font-semibold tabular-nums text-slate-900 dark:text-white';

/**
 * A card's earnings, tappable where the figure equals its drill (the card's
 * valueInr this FY). Points on a card with no point value are worth ₹0 there,
 * so they stay plain text; only its cashback, if any, opens the drill.
 */
function CardFigure({ row, onOpen }: { row: RewardCardRow; onOpen: () => void }) {
  if (!row.cardId) return <span className={figureClass}>{nativeText(row)}</span>;
  if (!row.unvalued) {
    return (
      <DrillValue onClick={onOpen} label={`view ${row.card} rewards`} className={figureClass}>
        {nativeText(row)}
      </DrillValue>
    );
  }
  return (
    <span className={figureClass}>
      {formatCount(row.points)} pts
      {row.cash > 0 && (
        <>
          {' + '}
          <DrillValue onClick={onOpen} label={`view ${row.card} rewards`} className={figureClass}>
            {formatRupees(row.cash)}
          </DrillValue>
        </>
      )}
    </span>
  );
}

export function RewardsEarnedView({ widget, data, loading, onPageChange }: TemplateViewProps) {
  const [drill, setDrill] = useState<{ title: string; cardId: string | null } | null>(null);
  if (!isPivotTableData(data)) return <WidgetNote>This widget can&apos;t show this data.</WidgetNote>;
  const model = buildRewardsEarned(data);
  const title = widgetTitle(widget);

  if (model.rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={Gift}
        title="No rewards yet this financial year"
        description="Rewards on your cards' spends add up here from April."
        className="m-4"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="rewards-earned-view">
      <div className="shrink-0 px-4 pb-2">
        <DrillValue
          onClick={() => setDrill({ title, cardId: null })}
          label="view underlying data"
          className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white"
        >
          {formatRupees(model.totalInr)}
        </DrillValue>
        {model.unvaluedPoints > 0 && (
          <p className="text-2xs text-slate-500 dark:text-slate-400" data-testid="rewards-unvalued">
            + {formatCount(model.unvaluedPoints)} points not valued
          </p>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {model.rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 px-4 py-2" data-testid="rewards-row">
            <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{row.card}</span>
            <span className="flex shrink-0 items-baseline gap-1 text-xs">
              <CardFigure row={row} onOpen={() => setDrill({ title: `${title} · ${row.card}`, cardId: row.cardId })} />
              {row.unvalued && row.cardId && (
                <>
                  <span className="text-slate-400">·</span>
                  <Link
                    href={`/rewards/rules?account=${encodeURIComponent(row.cardId)}`}
                    className="font-medium text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400"
                  >
                    Set value
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ListPager page={data.page} unit="card" onPageChange={onPageChange} loading={loading} />
      {drill && (
        <LazyKpiUnderlyingDialog
          source={{ kind: 'adhoc', request: rewardsRequest(drill.cardId) }}
          title={drill.title}
          open
          onOpenChange={(o) => !o && setDrill(null)}
        />
      )}
    </div>
  );
}
