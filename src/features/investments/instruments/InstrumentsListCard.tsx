'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
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
import { useSearchText } from '@/features/shell/useSearchText';
import type { Instrument, InstrumentType } from '@/lib/types';

import { InstrumentAddDialog, type InstrumentAddMode } from './InstrumentAddDialog';
import { InstrumentEditDialog } from './InstrumentEditDialog';
import {
  type InstrumentListRow,
  instrumentListRow,
  INSTRUMENTS_SIZE_OPTIONS,
  instrumentsUrl,
  type InstrumentsUrlState,
  SORT_OPTIONS,
  TYPE_CHIPS,
} from './instrumentsModel';
import { ResetInstrumentDialog } from './ResetInstrumentDialog';

interface RowActions {
  onEdit: (id: string) => void;
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

function columnsFor({ onEdit, onReset }: RowActions) {
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
                <Badge size="sm" className="shrink-0">
                  Not held
                </Badge>
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
        <Badge variant="outline" size="sm">
          {row.original.typeLabel}
        </Badge>
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
          <Badge size="sm" tone={row.original.source.tone}>
            {row.original.source.label}
          </Badge>
        ) : (
          <Text variant="body" tone="ink-3">{'—'}</Text>
        ),
    }),
    ch.display({
      id: 'asOf',
      header: 'As of',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.asOf ? 'ink-2' : 'ink-3'}>
          {row.original.asOf ?? '—'}
        </Text>
      ),
    }),
    ch.display({
      id: 'edit',
      header: '',
      meta: { size: 'xs', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <InRow>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Edit ${row.original.name}`}
            icon={<Icon name="pencil-simple" size="sm" />}
            onClick={() => onEdit(row.original.id)}
          />
        </InRow>
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
  /** Instruments per type over the search and stale filter, for the chip counts. */
  counts: Partial<Record<InstrumentType, number>>;
  /** True when the whole catalog is empty (no filter applied and nothing on page 1). */
  catalogEmpty: boolean;
}

/** Search, type chips, Stale price and name order over the instruments table, with the Add, Edit and Reset dialogs. Every control is one URL change. */
export function InstrumentsListCard({ state, items, totalElements, totalPages, counts, catalogEmpty }: InstrumentsListCardProps) {
  const router = useRouter();
  const go = (next: Partial<InstrumentsUrlState>) => router.push(instrumentsUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  const [dialog, setDialog] = React.useState<DialogState>(null);

  const byId = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const rows = React.useMemo(() => items.map(instrumentListRow), [items]);
  const columns = React.useMemo(
    () => columnsFor({ onEdit: (id) => setDialog({ kind: 'edit', id }), onReset: (id) => setDialog({ kind: 'reset', id }) }),
    [],
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
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="flex flex-col gap-space-8 desk:flex-row desk:items-center desk:gap-space-8">
        <TextField
          type="search"
          size="md"
          className="w-full desk:flex-1 desk:max-w-container-sm"
          prefix={<Icon name="search" size="sm" />}
          clearable
          placeholder="Search symbol, ISIN, name"
          value={text}
          onValueChange={setText}
        />
        <div className="flex items-center gap-space-8 overflow-x-auto">
          {TYPE_CHIPS.map((chip) => {
            const count = chip.value ? counts[chip.value] : undefined;
            return (
              <FilterChip key={chip.value || 'all'} className="shrink-0" selected={state.type === chip.value} onClick={() => go({ type: chip.value, page: 0 })}>
                {count != null ? `${chip.label} · ${count}` : chip.label}
              </FilterChip>
            );
          })}
          <FilterChip className="shrink-0" selected={state.stale} onClick={() => go({ stale: !state.stale, page: 0 })}>
            Stale price
          </FilterChip>
          <div className="shrink-0">
            <Select
              value={state.sort}
              options={SORT_OPTIONS}
              onValueChange={(v) => go({ sort: v as InstrumentsUrlState['sort'], page: 0 })}
              trigger={<FilterChip hasDropdown>{sortLabel}</FilterChip>}
            />
          </div>
        </div>
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) => <PhoneSub row={row} onReset={(id) => setDialog({ kind: 'reset', id })} />}
          onRowSelect={(row) => setDialog({ kind: 'edit', id: row.id })}
          empty={
            catalogEmpty ? (
              <EmptyState
                compact
                description="No instruments recorded yet. Add stocks, mutual funds and ETFs to track their prices."
                action={{ label: 'Add instrument', variant: 'link', onSelect: () => setDialog({ kind: 'add', mode: 'catalog' }) }}
              />
            ) : (
              <EmptyState
                compact
                description={state.page > 0 ? 'No more instruments.' : 'No instruments match your search or filter.'}
                action={filtered ? { label: 'Clear filters', variant: 'link', onSelect: () => go({ q: '', type: '', stale: false, page: 0 }) } : undefined}
              />
            )
          }
          stickyHeader={false}
        />
      </Card>
      <Text variant="label" tone="ink-3" as="div">
        {'Adding an instrument searches the AMFI and Yahoo catalogs as you type and creates the entry on pick. If it isn’t there, '}
        <Button variant="link" size="sm" onClick={() => setDialog({ kind: 'add', mode: 'manual' })}>
          enter it by hand
        </Button>
        {' with a Yahoo symbol or an AMFI code.'}
      </Text>
      {dialog?.kind === 'add' ? <InstrumentAddDialog initialMode={dialog.mode} onClose={close} /> : null}
      {dialog?.kind === 'edit' && target ? (
        <InstrumentEditDialog instrument={target} onClose={close} onReset={() => setDialog({ kind: 'reset', id: target.id })} />
      ) : null}
      {dialog?.kind === 'reset' && target ? <ResetInstrumentDialog instrument={target} onClose={close} /> : null}
    </div>
  );
}

/** The instruments table while the page loads. */
export function InstrumentsListSkeleton() {
  return (
    <Card>
      <DataTable columns={columnsFor({ onEdit: () => undefined, onReset: () => undefined })} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
    </Card>
  );
}
