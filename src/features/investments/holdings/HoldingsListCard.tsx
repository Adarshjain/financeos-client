'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Button,
  Card,
  Conceal,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterChip,
  Icon,
  Pager,
  Select,
  Text,
  TextField,
} from '@/components/ds';
import { CorporateActionDialog } from '@/features/investments/corporate-actions/CorporateActionDialog';
import { useSearchText } from '@/features/shell/useSearchText';
import type { HoldingRow, HoldingsGroup } from '@/lib/investments.types';
import type { InstrumentType } from '@/lib/types';

import type { InstrumentRef } from '../investmentsFormat';
import {
  groupBands,
  type HoldingListRow,
  holdingListRow,
  HOLDINGS_SIZE_OPTIONS,
  holdingsUrl,
  type HoldingsUrlState,
  mergedLine,
  SORT_OPTIONS,
  TYPE_CHIPS,
} from './holdingsModel';

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
          <Text variant="body" truncate>
            <Text variant="body-strong" as="span">
              {r.title}
            </Text>
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
            {r.noPrice && !r.merged ? (
              <Text variant="body" tone="ink-3" as="span" className="max-desk:hidden">
                {' · at cost (no price)'}
              </Text>
            ) : null}
          </Text>
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
    meta: { size: 'md', align: 'end', phone: 'hidden' },
    cell: ({ row }) => {
      const r = row.original;
      if (!r.ltp) return <Text variant="body" tone="ink-3">{'—'}</Text>;
      return (
        <span className="flex items-baseline justify-end gap-space-4">
          <Text variant="body-strong"><Conceal whole>{r.ltp}</Conceal></Text>
          {r.dayPct ? <Move move={r.dayPct} /> : null}
        </span>
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
    meta: { size: 'sm', align: 'end', phone: 'amount' },
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
    meta: { size: 'md', align: 'end', phone: 'status' },
    cell: ({ row }) => {
      const r = row.original;
      if (r.merged) {
        return (
          <>
            <Text variant="label" tone="ink-3" className="desk:hidden">
              {r.position}
            </Text>
            <Text variant="body" tone="ink-3" className="max-desk:hidden">
              {'\u2014'}
            </Text>
          </>
        );
      }
      if (!r.pnl) return <Text variant="body" tone="ink-3">{'—'}</Text>;
      return (
        <span className="flex items-baseline justify-end gap-space-4">
          <Text variant="body-strong" tone={r.pnl.tone}>
            <span className="desk:hidden"><Conceal whole>{r.pnl.amount}</Conceal></span>
            <span className="max-desk:hidden"><Conceal whole>{r.pnl.plain}</Conceal></span>
          </Text>
          {r.pnl.pct ? <Text variant="caption" tone={r.pnl.tone}>{`· ${r.pnl.pct}`}</Text> : null}
        </span>
      );
    },
  }),
  ch.display({
    id: 'open',
    header: '',
    meta: { size: 'xs', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" iconOnly aria-label={`Open ${row.original.title}`}>
        <Link href={row.original.href} prefetch={false}>
          <Icon name="chevron-right" size="sm" />
        </Link>
      </Button>
    ),
  }),
];

/** The second line of a phone row: "40 × ₹1,742.60 −0.3%", "10 × ₹2,150 · manual price", "Merged into …". */
function PhoneSub({ row }: { row: HoldingListRow }) {
  if (row.merged) {
    return (
      <div className="min-w-0 overflow-hidden">
        <Text variant="label" tone="ink-3" truncate>
          {mergedLine(row.merged)}
        </Text>
      </div>
    );
  }
  return (
    <div className="flex flex-col min-w-0">
      <Text variant="label" tone="ink-3" truncate>
        <Conceal>{row.position}</Conceal>
        {row.dayPct ? <Text variant="label" tone={row.dayPct.tone ?? 'ink-3'} as="span">{` ${row.dayPct.text}`}</Text> : null}
        {row.manualPrice ? ' · manual price' : null}
        {row.noPrice ? ' · at cost (no price)' : null}
      </Text>
      {row.noPrice ? <NoPriceNote instrumentId={row.id} /> : null}
    </div>
  );
}

export interface HoldingsListCardProps {
  state: HoldingsUrlState;
  rows: HoldingRow[];
  groups: HoldingsGroup[];
  totalElements: number;
  totalPages: number;
  /** The broker accounts for the Broker filter. */
  brokers: { id: string; name: string }[];
  /** Holdings per type over the filtered set, for the chip counts. */
  counts: Partial<Record<InstrumentType, number>>;
}

/** The search, type chips, Broker and sort controls over the grouped holdings table. Every control is one URL change. */
export function HoldingsListCard({ state, rows, groups, totalElements, totalPages, brokers, counts }: HoldingsListCardProps) {
  const router = useRouter();
  const go = (next: Partial<HoldingsUrlState>) => router.push(holdingsUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));

  const listRows = React.useMemo(() => rows.map(holdingListRow), [rows]);
  const bands = React.useMemo(() => groupBands(groups), [groups]);
  const [merging, setMerging] = React.useState<InstrumentRef | null>(null);
  const byId = React.useMemo(() => new Map(rows.map((r) => [r.instrumentId, r])), [rows]);

  const brokerOptions = [{ value: '', label: 'All brokers' }, ...brokers.map((b) => ({ value: b.id, label: b.name }))];
  const brokerName = brokers.find((b) => b.id === state.broker)?.name;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === state.sort)?.label ?? SORT_OPTIONS[0].label;

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="holdings"
      sizeOptions={HOLDINGS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  const filtered = state.q !== '' || state.type !== '' || state.broker !== '';
  const recordMerger = (instrumentId: string) => {
    const row = byId.get(instrumentId);
    if (row) setMerging({ id: row.instrumentId, name: row.name, symbol: row.symbol });
  };

  return (
    <RecordMergerContext.Provider value={recordMerger}>
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="flex items-center gap-space-8 overflow-x-auto">
        <TextField
          type="search"
          size="md"
          className="shrink-0 w-container-xs"
          prefix={<Icon name="search" size="sm" />}
          clearable
          clearLabel="Clear search"
          placeholder="Symbol or name"
          value={text}
          onValueChange={setText}
        />
        {TYPE_CHIPS.map((chip) => {
          const count = chip.value ? counts[chip.value] : undefined;
          return (
            <FilterChip
              key={chip.value || 'all'}
              className="shrink-0"
              selected={state.type === chip.value}
              onClick={() => go({ type: chip.value, page: 0 })}
            >
              {chip.label}
              {chip.value === '' ? <span className="max-desk:hidden">{' assets'}</span> : null}
              {count != null ? <span className="max-desk:hidden">{` · ${count}`}</span> : null}
            </FilterChip>
          );
        })}
        {brokers.length > 0 ? (
          <Select
            value={state.broker}
            options={brokerOptions}
            onValueChange={(v) => go({ broker: v as string, page: 0 })}
            trigger={
              <FilterChip hasDropdown selected={state.broker !== ''} className="shrink-0">
                {brokerName ?? 'Broker'}
              </FilterChip>
            }
          />
        ) : null}
        <div className="shrink-0 ml-auto">
          <Select
            value={state.sort}
            options={SORT_OPTIONS}
            onValueChange={(v) => go({ sort: v as HoldingsUrlState['sort'], page: 0 })}
            trigger={<FilterChip hasDropdown>{sortLabel}</FilterChip>}
          />
        </div>
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={listRows}
          getRowId={(row) => row.id}
          pager={pager}
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
            <EmptyState
              compact
              description={filtered ? 'No holdings match.' : 'No holdings yet. Record a trade or import your tradebook.'}
              action={filtered ? { label: 'Clear filters', variant: 'link', onSelect: () => router.push(holdingsUrl({ ...state, q: '', type: '', broker: '', page: 0 })) } : undefined}
            />
          }
          stickyHeader={false}
        />
      </Card>
    </div>
    {merging ? <CorporateActionDialog instrument={merging} type="merger" onClose={() => setMerging(null)} /> : null}
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
