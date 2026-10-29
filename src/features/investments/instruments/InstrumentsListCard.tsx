'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Pager,
  Select,
  StatusWord,
  Text,
} from '@/components/ds';
import { FilterRowSkeleton } from '@/features/investments/FilterRowSkeleton';
import { loadInstrumentAddDialog, loadInstrumentEditDialog, loadResetInstrumentDialog } from '@/features/investments/lazyDialogs';
import { useSearchText } from '@/features/shell/useSearchText';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { Instrument } from '@/lib/types';

import type { InstrumentAddMode } from './InstrumentAddDialog';
import {
  type InstrumentListRow,
  instrumentListRow,
  INSTRUMENTS_SIZE_OPTIONS,
  instrumentsUrl,
  type InstrumentsUrlState,
  SORT_OPTIONS,
  TYPE_CHIPS,
} from './instrumentsModel';

interface RowActions {
  onReset: (id: string) => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Keeps a press on a control inside a row from also pressing the row (which opens Edit). */
function InRow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex" onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
      {children}
    </span>
  );
}

/** "Edited for your account · Reset to catalog". */
function EditedLine({ row, onReset }: { row: InstrumentListRow; onReset: (id: string) => void }) {
  return (
    <Text variant="label" tone="ink-3" as="div" title={row.overriddenFields ? `Edited for your account: ${row.overriddenFields}` : undefined}>
      {'Edited for your account · '}
      <InRow>
        <Button variant="link" size="sm" onClick={() => onReset(row.id)}>
          Reset to catalog
        </Button>
      </InRow>
    </Text>
  );
}

const ch = createDataTableColumnHelper<InstrumentListRow>();

function columnsFor({ onReset }: RowActions) {
  return [
    ch.display({
      id: 'instrument',
      header: 'Instrument',
      meta: { size: 'fill', grow: 3, wrap: true, phone: 'main' },
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col min-w-0">
            <span className="flex items-center gap-space-8 min-w-0">
              <Text variant="body" truncate>
                <Text variant="body-strong" as="span">
                  {r.name}
                </Text>
                {r.symbol ? (
                  <Text variant="body" tone="ink-3" as="span">
                    {` · ${r.symbol}`}
                  </Text>
                ) : null}
              </Text>
              {r.notHeld ? (
                <StatusWord className="shrink-0">Not held</StatusWord>
              ) : null}
            </span>
            {r.overridden ? (
              <div className="max-desk:hidden">
                <EditedLine row={r} onReset={onReset} />
              </div>
            ) : null}
          </div>
        );
      },
    }),
    ch.display({
      id: 'type',
      header: 'Type',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body">{row.original.typeLabel}</Text>
      ),
    }),
    ch.display({
      id: 'exchange',
      header: 'Exchange',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.exchange ? 'ink' : 'ink-3'}>
          {row.original.exchange ?? '—'}
        </Text>
      ),
    }),
    ch.display({
      id: 'identifier',
      header: 'Identifier',
      meta: { size: 'md', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.identifier ? 'ink' : 'ink-3'} truncate>
          {row.original.identifier ?? '—'}
        </Text>
      ),
    }),
    ch.display({
      id: 'price',
      header: 'Price',
      meta: { size: 'sm', align: 'end', phone: 'amount' },
      cell: ({ row }) => {
        const r = row.original;
        if (!r.price) return <Text variant="body" tone="ink-3">No price</Text>;
        return (
          <Text variant="body-strong">
            <span className="desk:hidden">{r.priceRupees}</span>
            <span className="max-desk:hidden">{r.price}</span>
          </Text>
        );
      },
    }),
    ch.display({
      id: 'source',
      header: 'Source',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) =>
        row.original.source ? (
          <StatusWord tone={row.original.source.tone}>{row.original.source.label}</StatusWord>
        ) : (
          <Text variant="body" tone="ink-3">{'—'}</Text>
        ),
    }),
    ch.display({
      id: 'asOf',
      header: 'As of',
      meta: { size: 'date', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.asOf ? 'ink-2' : 'ink-3'}>
          {row.original.asOf ?? '—'}
        </Text>
      ),
    }),
  ];
}

/** The phone row's second lines: the edited note, then "INE009A01021 · Yahoo · 13 Oct". */
function PhoneSub({ row, onReset }: { row: InstrumentListRow; onReset: (id: string) => void }) {
  return (
    <div className="flex flex-col min-w-0">
      {row.overridden ? <EditedLine row={row} onReset={onReset} /> : null}
      <Text variant="label" tone="ink-3" truncate>
        {row.sub}
      </Text>
    </div>
  );
}

type DialogState =
  | { kind: 'add'; mode: InstrumentAddMode }
  | { kind: 'edit'; id: string }
  | { kind: 'reset'; id: string }
  | null;

export interface InstrumentsListCardProps {
  state: InstrumentsUrlState;
  items: Instrument[];
  totalElements: number;
  totalPages: number;
  /** True when the whole catalog is empty (no filter applied and nothing on page 1). */
  catalogEmpty: boolean;
}

/** Search, type chips, Stale price and name order over the instruments table, with the Add, Edit and Reset dialogs. Every control is one URL change. */
export function InstrumentsListCard({ state, items, totalElements, totalPages, catalogEmpty }: InstrumentsListCardProps) {
  const router = useRouter();
  const go = (next: Partial<InstrumentsUrlState>) => router.push(instrumentsUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const { Component: InstrumentAddDialog, run: runAdd } = useLazyDialog(loadInstrumentAddDialog);
  const { Component: InstrumentEditDialog, run: runEdit } = useLazyDialog(loadInstrumentEditDialog);
  const { Component: ResetInstrumentDialog, run: runReset } = useLazyDialog(loadResetInstrumentDialog);
  // Each dialog loads when it is opened; the list's own rows and buttons stay as they were.
  const openDialog = (next: NonNullable<DialogState>) =>
    void (next.kind === 'add' ? runAdd : next.kind === 'edit' ? runEdit : runReset)(() => setDialog(next));

  const byId = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const rows = React.useMemo(() => items.map(instrumentListRow), [items]);
  const columns = React.useMemo(
    () => columnsFor({ onReset: (id) => void runReset(() => setDialog({ kind: 'reset', id })) }),
    [runReset],
  );
  const target = dialog && dialog.kind !== 'add' ? byId.get(dialog.id) : undefined;
  const close = () => setDialog(null);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === state.sort)?.label ?? SORT_OPTIONS[0].label;
  const filtered = state.q !== '' || state.type !== '' || state.stale;

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="instruments"
      sizeOptions={INSTRUMENTS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar
        search={{ value: text, onValueChange: setText }}
        changed={filtered}
        onReset={() => go({ q: '', type: '', stale: false, page: 0 })}
      >
        <Select
          value={state.type}
          options={TYPE_CHIPS}
          onValueChange={(v) => go({ type: (v ?? '') as InstrumentsUrlState['type'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.type !== ''} onReset={() => go({ type: '', page: 0 })} className="shrink-0">
              {TYPE_CHIPS.find((c) => c.value === state.type && c.value !== '')?.label ?? 'Type'}
            </FilterChip>
          }
        />
        <FilterChip
          className="shrink-0"
          changed={state.stale}
          onReset={() => go({ stale: false, page: 0 })}
          onClick={() => go({ stale: !state.stale, page: 0 })}
        >
          Stale price
        </FilterChip>
        <div className="shrink-0 ml-auto">
          <Select
            value={state.sort}
            options={SORT_OPTIONS}
            onValueChange={(v) => go({ sort: v as InstrumentsUrlState['sort'], page: 0 })}
            trigger={<FilterChip hasDropdown className="shrink-0">{sortLabel}</FilterChip>}
          />
        </div>
      </FilterBar>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) => <PhoneSub row={row} onReset={(id) => openDialog({ kind: 'reset', id })} />}
          onRowSelect={(row) => openDialog({ kind: 'edit', id: row.id })}
          empty={
            catalogEmpty ? (
              <EmptyState
                title="No instruments yet"
                description="Add stocks, mutual funds and ETFs to track their prices."
                action={{ label: 'Add instrument', variant: 'primary', onSelect: () => openDialog({ kind: 'add', mode: 'catalog' }) }}
              />
            ) : (
              <EmptyState
                title={state.page > 0 ? 'No more instruments' : 'No instruments match'}
                description={state.page > 0 ? 'This is past the last page.' : 'Try a different search or filter.'}
                action={
                  filtered
                    ? { label: 'Clear filters', variant: 'secondary', onSelect: () => go({ q: '', type: '', stale: false, page: 0 }) }
                    : undefined
                }
              />
            )
          }
          stickyHeader={false}
        />
      </Card>
      <Text variant="label" tone="ink-3" as="div">
        {'Adding an instrument searches the AMFI and Yahoo catalogs as you type and creates the entry on pick. If it isn’t there, '}
        <Button variant="link" size="sm" onClick={() => openDialog({ kind: 'add', mode: 'manual' })}>
          enter it by hand
        </Button>
        {' with a Yahoo symbol or an AMFI code.'}
      </Text>
      {dialog?.kind === 'add' && InstrumentAddDialog ? <InstrumentAddDialog initialMode={dialog.mode} onClose={close} /> : null}
      {dialog?.kind === 'edit' && target && InstrumentEditDialog ? (
        <InstrumentEditDialog instrument={target} onClose={close} onReset={() => openDialog({ kind: 'reset', id: target.id })} />
      ) : null}
      {dialog?.kind === 'reset' && target && ResetInstrumentDialog ? <ResetInstrumentDialog instrument={target} onClose={close} /> : null}
    </div>
  );
}

/** The filter row and instruments table while the page loads. */
export function InstrumentsListSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterRowSkeleton chips={2} />
      <Card>
        <DataTable columns={columnsFor({ onReset: () => undefined })} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
      </Card>
    </div>
  );
}
