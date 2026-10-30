'use client';

// card_utilisation: how much of each open credit card's limit is in use right now (live balance ÷ limit,
// from the server), most utilised first, cards at or over 30% flagged, and an overall row when there are
// several cards.

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { BarRow, type BarRowTone, BuiltinError, BuiltinNote } from '@/features/dashboards/builtins/BuiltinParts';
import { stringParam } from '@/features/dashboards/builtins/subtitlesModel';
import type { BuiltinBodyProps } from '@/features/dashboards/builtins/types';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney, formatPercent } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { UTILISATION_WATCH_PCT, utilisationTone } from '@/lib/utilisation';

import { buildUtilisationModel, type UtilisationRow } from './cardUtilisationModel';
import { CardUtilisationSkeleton } from './CardUtilisationSkeleton';

const TONE: Record<ReturnType<typeof utilisationTone>, BarRowTone> = {
  low: 'brand',
  medium: 'warning',
  high: 'danger',
};

const TEXT_TONE = { low: 'ink', medium: 'warning', high: 'danger' } as const;

function Percent({ pct }: { pct: number | null }) {
  return (
    <Text variant="body-strong" tone={pct == null ? 'ink-3' : TEXT_TONE[utilisationTone(pct)]}>
      {pct == null || !Number.isFinite(pct) ? '—' : formatPercent(pct)}
    </Text>
  );
}

function owedLine(row: UtilisationRow, onOpen: (row: UtilisationRow) => void) {
  return (
    <>
      <Button variant="link" size="sm" onClick={() => onOpen(row)}>
        {formatMoney(row.owed)}
      </Button>{' '}
      owed {row.limit != null ? `of ${formatMoney(row.limit)}` : '· no limit set'}
      {row.flagged ? (
        <>
          {' · '}
          <StatusWord tone="warning">Over {UTILISATION_WATCH_PCT}%</StatusWord>
        </>
      ) : null}
    </>
  );
}

export function CardUtilisationBody({ params, className }: BuiltinBodyProps) {
  const accountId = stringParam(params, 'accountId');
  const [open, setOpen] = React.useState<UtilisationRow | null>(null);
  const { data: accounts, isLoading, error, refetch } = useAccounts();
  const today = todayInAppZone();
  const model = React.useMemo(() => buildUtilisationModel(accounts ?? [], accountId, today), [accounts, accountId, today]);

  let body: React.ReactNode;
  if (isLoading && !accounts) {
    body = <CardUtilisationSkeleton />;
  } else if (error) {
    body = <BuiltinError message={getErrorMessage(error, "Couldn't load cards.")} action={{ label: 'Retry', onSelect: () => void refetch() }} />;
  } else if (model.rows.length === 0) {
    body = accountId ? (
      <BuiltinNote>This card is closed or no longer exists.</BuiltinNote>
    ) : (
      <EmptyState
        compact
        description="Add a credit card to see how much of its limit you're using."
        action={{ label: 'Go to accounts', href: appHref('/accounts'), variant: 'link' }}
      />
    );
  } else {
    body = (
      <>
        {model.overall ? (
          <BarRow
            data-testid="utilisation-overall"
            title="All cards"
            trailing={<Percent pct={model.overall.pct} />}
            value={model.overall.pct ?? 0}
            tone={TONE[utilisationTone(model.overall.pct)]}
            caption={`${formatMoney(model.overall.owed)} owed of ${formatMoney(model.overall.limit)}`}
          />
        ) : null}
        {model.rows.map((row) => (
          <BarRow
            key={row.id}
            data-testid="utilisation-row"
            data-account-id={row.id}
            title={row.name}
            trailing={<Percent pct={row.pct} />}
            value={row.pct ?? 0}
            tone={TONE[utilisationTone(row.pct)]}
            caption={owedLine(row, setOpen)}
          />
        ))}
      </>
    );
  }
  return (
    <div className={className} data-testid="card-utilisation-widget">
      {body}
      {open ? (
        <LazyReportRowBreakdownDialog datasource="net_worth" rowId={open.id} title={open.name} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
