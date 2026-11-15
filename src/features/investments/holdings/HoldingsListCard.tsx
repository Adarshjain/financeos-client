'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import type { InstrumentRef } from '@/features/investments/investmentsFormatModel';
import { INVESTMENTS_IMPORT_HREF } from '@/features/investments/investmentsTabs';
import { loadCorporateActionDialog } from '@/features/investments/lazyDialogs';
import { useSearchText } from '@/features/shell/useSearchText';
import type { HoldingRow, HoldingsGroup } from '@/lib/investments.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { AccountType } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import {
  groupBands,
  type HoldingListRow,
  holdingListRow,
  holdingsUrl,
  type HoldingsUrlState,
  mergedLine,
  SORT_OPTIONS,
  sortFromValue,
  sortValue,
  TYPE_OPTIONS,
} from './holdingsModel';

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];
const ALL_BROKERS: SelectOption[] = [{ value: '', label: 'All brokers' }];

/** Opens the record-a-merger dialog for a holding; the table's cells reach it through here. */
const RecordMergerContext = React.createContext<(instrumentId: string) => void>(() => undefined);

const ch = createDataTableColumnHelper<HoldingListRow>();

function Move({ move }: { move: { text: string; tone?: 'positive' | 'danger' } }) {
  return (
    <Text variant="caption" tone={move.tone ?? 'ink-3'} as="span">
      {move.text}
    </Text>
  );
}

/** The record-a-merger line under a holding that has no price. */
function NoPriceNote({ instrumentId }: { instrumentId: string }) {
  const record = React.useContext(RecordMergerContext);
  return (
    <Text variant="label" tone="ink-3" as="div">
      No live price. If it merged or delisted,{' '}
      <Button
        variant="link"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          record(instrumentId);
        }}
      >
        record a merger
      </Button>
      .
    </Text>
  );
}

const columns = [
  ch.display({
    id: 'holding',
    header: 'Holding',
    meta: { size: 'fill', grow: 2, wrap: true, phone: 'main' },
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="flex flex-col min-w-0">
          <div className="desk:hidden">
            <Text variant="caption" tone="ink-3" as="span">
              <Conceal>{r.phone.caption}</Conceal>
            </Text>
          </div>
          <Text variant="body" as="span">
            {r.phone.title === r.title ? (
              <Text variant="body-strong" as="span">
                {r.title}
              </Text>
            ) : (
              <>
                <Text variant="body-strong" as="span" className="desk:hidden">
                  {r.phone.title}
                </Text>
                <Text variant="body-strong" as="span" className="max-desk:hidden">
                  {r.title}
                </Text>
              </>
            )}
            {r.name ? (
              <Text variant="body" tone="ink-3" as="span" className="max-desk:hidden">
                {` · ${r.name}`}
              </Text>
            ) : null}
            {r.merged ? (
              <Text variant="body" tone="ink-3" as="span" className="max-desk:hidden">
                {` · ${mergedLine(r.merged)}`}
              </Text>
            ) : null}
            {r.manualPrice && !r.merged ? (
              <Text variant="body" tone="ink-3" as="span" className="max-desk:hidden">
                {' · manual price'}
              </Text>
            ) : null}
            {r.priceNote && !r.merged ? (
              <Text variant="body" tone="ink-3" as="span" className="max-desk:hidden">
                {` · ${r.priceNote}`}
              </Text>
            ) : null}
          </Text>
          {r.merged ? (
            <div className="desk:hidden">
              <Text variant="label" tone="ink-3" as="span">
                {mergedLine(r.merged)}
              </Text>
            </div>
          ) : null}
          {r.phone.note ? (
            <div className="desk:hidden">
              <Text variant="label" tone="ink-3" as="span">
                {r.phone.note}
              </Text>
            </div>
          ) : null}
          {r.noPrice && !r.merged ? (
            <div className="max-desk:hidden">
              <NoPriceNote instrumentId={r.id} />
            </div>
          ) : null}
        </div>
      );
    },
  }),
  ch.display({
    id: 'qty',
    header: 'Qty',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body-strong"><Conceal whole>{row.original.quantity}</Conceal></Text>,
  }),
  ch.display({
    id: 'avgCost',
    header: 'Avg cost',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body" tone="ink-3"><Conceal whole>{row.original.avgCost ?? '—'}</Conceal></Text>,
  }),
  ch.display({
    id: 'ltp',
    header: 'LTP · Day',
    meta: { size: 'md', align: 'end', wrap: true, phone: 'status' },
    cell: ({ row }) => {
      const r = row.original;
      const line = r.phone.ltp;
      return (
        <>
          {line ? (
            <div className="desk:hidden">
              <Text variant="caption" tone="ink-3" as="span">
                <Conceal>{line.text}</Conceal>
              </Text>
              {line.dayPct ? (
                <Text variant="caption" tone={line.dayPct.tone ?? 'ink-3'} as="span">
                  {` (${line.dayPct.text})`}
                </Text>
              ) : null}
            </div>
          ) : null}
          <div className="max-desk:hidden desk:whitespace-nowrap desk:overflow-hidden">
            {r.ltp ? (
              <span className="flex items-baseline justify-end gap-space-4">
                <Text variant="body-strong"><Conceal whole>{r.ltp}</Conceal></Text>
                {r.dayPct ? <Move move={r.dayPct} /> : null}
              </span>
            ) : (
              <Text variant="body" tone="ink-3">{'—'}</Text>
            )}
          </div>
        </>
      );
    },
  }),
  ch.display({
    id: 'invested',
    header: 'Invested',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body" tone="ink-3"><Conceal whole>{row.original.invested ?? '—'}</Conceal></Text>,
  }),
  ch.display({
    id: 'current',
    header: 'Current',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body-strong">
        <span className="desk:hidden"><Conceal whole>{row.original.current}</Conceal></span>
        <span className="max-desk:hidden"><Conceal whole>{row.original.currentPlain}</Conceal></span>
      </Text>
    ),
  }),
  ch.display({
    id: 'pnl',
    header: 'P&L',
    meta: { size: 'md', align: 'end', wrap: true, phone: 'amount' },
    cell: ({ row }) => {
      const r = row.original;
      const { returnPct, returnAmount } = r.phone;
      return (
        <>
          <div className="desk:hidden flex flex-col items-end">
            {r.merged ? null : (
              <>
                <Text variant="caption" tone={returnPct?.tone ?? 'ink-3'}>
                  {returnPct ? returnPct.text : '\u00a0'}
                </Text>
                {returnAmount ? (
                  <Text variant="body-strong" tone={returnAmount.tone}>
                    <Conceal>{returnAmount.text}</Conceal>
                  </Text>
                ) : (
                  <Text variant="body-strong" tone="ink-3">
                    {'—'}
                  </Text>
                )}
              </>
            )}
          </div>
          <div className="max-desk:hidden desk:whitespace-nowrap desk:overflow-hidden">
            {r.merged || !r.pnl ? (
              <Text variant="body" tone="ink-3">
                {r.merged ? '\u2014' : '—'}
              </Text>
            ) : (
              <span className="flex items-baseline justify-end gap-space-4">
                <Text variant="body-strong" tone={r.pnl.tone}>
                  <Conceal whole>{r.pnl.plain}</Conceal>
                </Text>
                {r.pnl.pct ? <Text variant="caption" tone={r.pnl.tone}>{`· ${r.pnl.pct}`}</Text> : null}
              </span>
            )}
          </div>
        </>
      );
    },
  }),
];

/** The bottom left of a phone row: "Invested ₹3,396.05", and the record-a-merger line under an unpriced holding. */
function PhoneSub({ row }: { row: HoldingListRow }) {
  return (
    <div className="flex flex-col min-w-0">
      {row.phone.invested ? (
        <Text variant="caption" tone="ink-3">
          <Conceal>{row.phone.invested}</Conceal>
        </Text>
      ) : null}
      {row.noPrice && !row.merged ? <NoPriceNote instrumentId={row.id} /> : null}
    </div>
  );
}

export interface HoldingsListCardProps {
  state: HoldingsUrlState;
  rows: HoldingRow[];
  groups: HoldingsGroup[];
  /** The broker accounts for the Broker filter. */
  brokers: { id: string; name: string }[];
}

/** The search, asset type, Broker and sort controls over the grouped holdings table. Every control is one URL change. */
export function HoldingsListCard({ state, rows, groups, brokers }: HoldingsListCardProps) {
  const router = useAppRouter();
  const go = (next: Partial<HoldingsUrlState>) => router.replace(holdingsUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q }));

  const listRows = React.useMemo(() => rows.map(holdingListRow), [rows]);
  const bands = React.useMemo(() => groupBands(groups), [groups]);
  const [merging, setMerging] = React.useState<InstrumentRef | null>(null);
  const { Component: CorporateActionDialog, run: runMerge } = useLazyDialog(loadCorporateActionDialog);
  const byId = React.useMemo(() => new Map(rows.map((r) => [r.instrumentId, r])), [rows]);

  const brokerAccounts = React.useMemo(() => brokers.map((b) => ({ id: b.id, name: b.name, type: AccountType.BROKER })), [brokers]);
  const brokerName = brokers.find((b) => b.id === state.broker)?.name;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortValue(state))?.label ?? SORT_OPTIONS[0].label;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === state.type && o.value !== '')?.label ?? 'Asset type';

  const filtered = state.q !== '' || state.type !== '' || state.broker !== '';
  const recordMerger = (instrumentId: string) => {
    const row = byId.get(instrumentId);
    if (row) void runMerge(() => setMerging({ id: row.instrumentId, name: row.name, symbol: row.symbol }));
  };

  return (
    <RecordMergerContext.Provider value={recordMerger}>
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar
        search={{ value: text, onValueChange: setText }}
        changed={filtered}
        onReset={() => go({ q: '', type: '', broker: '' })}
      >
        <Select
          value={state.type}
          options={TYPE_OPTIONS}
          onValueChange={(v) => go({ type: (v ?? '') as HoldingsUrlState['type'] })}
          trigger={
            <FilterChip hasDropdown changed={state.type !== ''} onReset={() => go({ type: '' })} className="shrink-0">
              {typeLabel}
            </FilterChip>
          }
        />
        {brokers.length > 0 ? (
          <AccountPicker
            accounts={brokerAccounts}
            types={BROKER_TYPES}
            leadingOptions={ALL_BROKERS}
            value={state.broker}
            onValueChange={(v) => go({ broker: v ?? '' })}
            trigger={
              <FilterChip hasDropdown changed={state.broker !== ''} onReset={() => go({ broker: '' })} className="shrink-0">
                {brokerName ?? 'Broker'}
              </FilterChip>
            }
          />
        ) : null}
        <div className="shrink-0 ml-auto">
          <Select
            value={sortValue(state)}
            options={SORT_OPTIONS}
            onValueChange={(v) => go({ ...sortFromValue(String(v)) })}
            trigger={<FilterChip hasDropdown className="shrink-0">{sortLabel}</FilterChip>}
          />
        </div>
      </FilterBar>
      <Card>
        <DataTable
          columns={columns}
          data={listRows}
          getRowId={(row) => row.id}
          band={(row) => {
            const band = bands.get(row.assetType);
            if (!band) return null;
            return {
              key: band.key,
              label: (
                <>
                  {band.name}
                  <span className="max-desk:hidden">{` · ${band.total} · ${band.share}`}</span>
                </>
              ),
              action: <Text variant="label" tone="ink-3" as="span" className="desk:hidden"><Conceal>{band.total}</Conceal></Text>,
            };
          }}
          phoneSub={(row) => <PhoneSub row={row} />}
          onRowSelect={(row) => router.push(row.href)}
          rowState={(row) => (byId.get(row.id)?.mergedIntoName ? { muted: true } : undefined)}
          empty={
            filtered ? (
              <EmptyState
                title="No holdings match"
                description="Try a different search or filter."
                action={{ label: 'Clear filters', variant: 'secondary', href: holdingsUrl({ ...state, q: '', type: '', broker: '' }) }}
              />
            ) : (
              <EmptyState
                title="No holdings yet"
                description="Record a trade or import your tradebook."
                action={{ label: 'Import tradebook', variant: 'primary', href: INVESTMENTS_IMPORT_HREF }}
              />
            )
          }
          stickyHeader={false}
        />
      </Card>
    </div>
    {merging && CorporateActionDialog ? <CorporateActionDialog instrument={merging} type="merger" onClose={() => setMerging(null)} /> : null}
    </RecordMergerContext.Provider>
  );
}

/** The holdings table while the page loads. */
export function HoldingsListSkeleton() {
  return (
    <Card>
      <DataTable columns={columns} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
    </Card>
  );
}
