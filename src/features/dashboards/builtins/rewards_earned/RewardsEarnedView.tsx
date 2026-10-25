'use client';

// rewards_earned (view `rewards_fy`): rewards earned this financial year — a rupee headline (cashback +
// valued points) and one line per card in its own unit ("42,300 pts", "₹3,240", "1,200 pts + ₹300"), with no
// divider lines. The headline and each card's figure open their reward lines ("View underlying data" over
// reward_earnings); unvalued points are not tappable (their drill would read ₹0).

import React from 'react';

import { Button, EmptyState, ListRow, Text } from '@/components/ds';
import { ReportUnderlyingDialog } from '@/features/reports/underlying/ReportUnderlyingDialog';
import { widgetTitle } from '@/lib/dashboards.helpers';
import { isPivotTableData } from '@/lib/reports.helpers';

import { formatCount, formatRupees } from '../builtin.helpers';
import { BuiltinNote, BuiltinPager } from '../BuiltinParts';
import type { TemplateViewProps } from '../types';
import { buildRewardsEarned, nativeText, type RewardCardRow, rewardsRequest } from './rewardsEarned.model';

/** A card's earnings, tappable where the figure equals its drill; points on a card with no point value stay plain text. */
function CardFigure({ row, onOpen }: { row: RewardCardRow; onOpen: () => void }) {
  if (!row.cardId) return <Text variant="body-strong">{nativeText(row, { withValue: false })}</Text>;
  if (!row.unvalued) {
    return (
      <Text variant="body-strong">
        <Button variant="link" onClick={onOpen}>
          {nativeText(row, { withValue: false })}
        </Button>
      </Text>
    );
  }
  return (
    <Text variant="body-strong">
      {formatCount(row.points)} pts
      {row.cash > 0 ? (
        <>
          {' + '}
          <Button variant="link" onClick={onOpen}>
            {formatRupees(row.cash)}
          </Button>
        </>
      ) : null}
    </Text>
  );
}

export function RewardsEarnedView({ widget, data, loading, onPageChange }: TemplateViewProps) {
  const [drill, setDrill] = React.useState<{ title: string; cardId: string | null } | null>(null);
  if (!isPivotTableData(data)) return <BuiltinNote>This widget can&apos;t show this data.</BuiltinNote>;
  const model = buildRewardsEarned(data);
  const title = widgetTitle(widget);

  if (model.rows.length === 0) {
    return (
      <EmptyState
        compact
        title="No rewards yet this financial year"
        description="Rewards on your cards' spends add up here from April."
      />
    );
  }

  return (
    <div data-testid="rewards-earned-view" aria-busy={loading || undefined}>
      <div className="flex flex-col gap-space-2 pb-space-8">
        <Text variant="figure" as="div">
          <Button variant="link" onClick={() => setDrill({ title: `${title} · ${formatRupees(model.totalInr)}`, cardId: null })}>
            {formatRupees(model.totalInr)}
          </Button>
        </Text>
        {model.unvaluedPoints > 0 ? (
          <Text variant="caption" tone="ink-3" as="p" data-testid="rewards-unvalued">
            + {formatCount(model.unvaluedPoints)} points not valued
          </Text>
        ) : null}
      </div>
      {model.rows.map((row) => (
        <ListRow
          key={row.key}
          data-testid="rewards-row"
          borderTop={false}
          className="border-l-0 px-0"
          title={row.card}
          trailing={<CardFigure row={row} onOpen={() => setDrill({ title: `${title} · ${row.card} · ${formatRupees(row.cash + row.pointsValue)}`, cardId: row.cardId })} />}
        />
      ))}
      <BuiltinPager page={data.page} unit="card" onPageChange={onPageChange} />
      {drill ? <ReportUnderlyingDialog request={rewardsRequest(drill.cardId)} title={drill.title} onClose={() => setDrill(null)} /> : null}
    </div>
  );
}
