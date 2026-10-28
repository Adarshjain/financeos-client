'use client';

import React from 'react';

import { Badge, Card, createDataTableColumnHelper, DataTable, Text } from '@/components/ds';
import { formatMoney } from '@/lib/format';
import type { FnoTradePreview, ImportRow, ReconciledExecution } from '@/lib/types';

import { moveTone } from '../investmentsFormat';
import {
  applySelection,
  type CasRow,
  casRow,
  type ExecutionRow,
  executionRow,
  type FnoRow,
  fnoRow,
  fnoSkipped,
  mapInstrument,
  netRealized,
  setCreateNew,
  setFnoSkip,
  sortCasRows,
  sortExecutions,
} from './importModel';
import { MappingCell } from './MappingCell';
import type { RowState } from './types';

type RowStates = Record<number, RowState>;
type SetRowStates = React.Dispatch<React.SetStateAction<RowStates>>;
type FnoStates = Record<number, { skip: boolean }>;

const exec = createDataTableColumnHelper<ExecutionRow>();
const fno = createDataTableColumnHelper<FnoRow>();
const cas = createDataTableColumnHelper<CasRow>();

/** The rows that are not skipped are the selected ones; DataTable leaves selection mode when none is selected. */
const selectedOf = (ids: string[], skipped: (id: string) => boolean) => ids.filter((id) => !skipped(id));

export interface ExecutionsTableProps {
  executions: ReconciledExecution[];
  rowStates: RowStates;
  setRowStates: SetRowStates;
  /** True while the import runs: rows and their controls are locked. */
  locked: boolean;
}

/** Stocks & delivery executions: unmatched and duplicate rows first, each with an include box and its mapping. */
export function ExecutionsTable({ executions, rowStates, setRowStates, locked }: ExecutionsTableProps) {
  const rows = React.useMemo(() => sortExecutions(executions).map(executionRow), [executions]);
  const skipped = (id: string) => Boolean(rowStates[Number(id)]?.skip);

  const mapping = (row: ExecutionRow) => (
    <MappingCell
      label={row.symbol}
      matchedName={row.exec.matchedInstrument?.name}
      duplicate={row.exec.isDuplicate}
      state={rowStates[row.rowIndex]}
      type="stock"
      disabled={locked}
      onMap={(inst) => setRowStates((prev) => mapInstrument(prev, row.rowIndex, inst))}
      onCreateNew={(v) => setRowStates((prev) => setCreateNew(prev, row.rowIndex, v))}
    />
  );

  const columns = [
    exec.display({
      id: 'date',
      header: 'Date & side',
      meta: { size: 'md', wrap: true, phone: 'hidden' },
      cell: ({ row }) => (
        <>
          <Text variant="body" as="div">
            {row.original.date}
          </Text>
          <Text variant="label" tone="ink-3" as="div">
            {row.original.side}
          </Text>
        </>
      ),
    }),
    exec.display({
      id: 'settlement',
      header: 'CNC / MIS',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <span className="flex items-center gap-space-8">
          <Text variant="body" tone="ink-3" as="span" className="desk:hidden">{`${row.original.side} ·`}</Text>
          <Badge tone={row.original.settlement === 'MIS' ? 'info' : 'neutral'}>{row.original.settlement}</Badge>
        </span>
      ),
    }),
    exec.display({
      id: 'scrip',
      header: 'Scrip',
      meta: { size: 'fill', grow: 1, wrap: true, phone: 'main' },
      cell: ({ row }) => (
        <>
          <Text variant="body-strong" as="div">
            {row.original.symbol}
          </Text>
          <Text variant="label" tone="ink-3" as="div" className="max-desk:hidden">
            {row.original.scrip}
          </Text>
        </>
      ),
    }),
    exec.display({
      id: 'qty',
      header: 'Qty × price',
      meta: { size: 'md', align: 'end', wrap: true, phone: 'amount' },
      cell: ({ row }) => (
        <>
          <Text variant="body-strong" as="div">
            {row.original.qtyPrice}
          </Text>
          <Text variant="label" tone="ink-3" as="div">
            {row.original.total}
          </Text>
        </>
      ),
    }),
    exec.display({
      id: 'map',
      header: 'Status / map',
      meta: { size: 'fill', grow: 3, wrap: true, phone: 'hidden' },
      cell: ({ row }) => mapping(row.original),
    }),
  ];

  return (
    <div className="flex flex-col gap-space-8">
      <Text variant="overline" tone="ink-3" as="h3">
        Stocks & delivery executions
      </Text>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          selectable
          selectionAlwaysOn
          selection={selectedOf(
            rows.map((r) => r.id),
            skipped,
          )}
          onSelectionChange={(selected) =>
            setRowStates((prev) =>
              applySelection(
                prev,
                rows.map((r) => r.rowIndex),
                selected,
              ),
            )
          }
          rowState={(r) => ({ muted: skipped(r.id), disabled: locked })}
          phoneSub={(r) => (
            <div className="flex flex-col gap-space-4">
              <Text variant="caption" tone="ink-3" as="span">
                {`${r.date} · ${r.scrip}`}
              </Text>
              {mapping(r)}
            </div>
          )}
          stickyHeader={false}
        />
      </Card>
    </div>
  );
}

export interface FnoTableProps {
  trades: FnoTradePreview[];
  fnoRowStates: FnoStates;
  setFnoRowStates: React.Dispatch<React.SetStateAction<FnoStates>>;
  locked: boolean;
}

/** F&O closed trades: one row per contract with an include box, and the net realized P&L of what stays included. */
export function FnoTable({ trades, fnoRowStates, setFnoRowStates, locked }: FnoTableProps) {
  const rows = React.useMemo(() => trades.map(fnoRow), [trades]);
  const skipped = (id: string) => fnoSkipped(trades[Number(id)], Number(id), fnoRowStates);
  const net = netRealized(trades, fnoRowStates);

  const columns = [
    fno.display({
      id: 'contract',
      header: 'Contract',
      meta: { size: 'fill', grow: 3, wrap: true, phone: 'main' },
      cell: ({ row }) => (
        <>
          <Text variant="body" as="div">
            <Text variant="body-strong" as="span">
              {row.original.symbol}
            </Text>
            <Text variant="body" tone="ink-3" as="span">
              {` ${row.original.kind}${row.original.duplicate ? ' · Duplicate' : ''}`}
            </Text>
          </Text>
          <Text variant="label" tone="ink-3" as="div" className="max-desk:hidden">
            {row.original.detail}
          </Text>
        </>
      ),
    }),
    fno.display({
      id: 'qty',
      header: 'Qty',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body-strong">{row.original.quantity}</Text>,
    }),
    fno.display({
      id: 'buy',
      header: 'Buy value',
      meta: { size: 'md', align: 'end', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body-strong">{row.original.buy}</Text>,
    }),
    fno.display({
      id: 'sell',
      header: 'Sell value',
      meta: { size: 'md', align: 'end', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body-strong">{row.original.sell}</Text>,
    }),
    fno.display({
      id: 'charges',
      header: 'Charges',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3">
          {row.original.charges}
        </Text>
      ),
    }),
    fno.display({
      id: 'pnl',
      header: 'Realized P&L',
      meta: { size: 'md', align: 'end', phone: 'amount' },
      cell: ({ row }) => (
        <Text variant="body-strong" tone={row.original.pnlTone}>
          {row.original.pnl}
        </Text>
      ),
    }),
  ];

  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-space-12">
        <Text variant="overline" tone="ink-3" as="h3">
          F&O closed trades{' '}
          <Text variant="label" tone="ink-3" as="span">
            {`${trades.length} contract${trades.length > 1 ? 's' : ''}`}
          </Text>
        </Text>
        <Text variant="label" tone="ink-3" as="span">
          {'Net realized P&L: '}
          <Text variant="body-strong" tone={moveTone(net)} as="span">
            {formatMoney(net, { decimals: 'exact', sign: 'always' })}
          </Text>
        </Text>
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          selectable
          selectionAlwaysOn
          selection={selectedOf(
            rows.map((r) => r.id),
            skipped,
          )}
          onSelectionChange={(selected) =>
            setFnoRowStates((prev) => {
              let next = prev;
              rows.forEach((r) => {
                next = setFnoSkip(next, r.index, !selected.includes(r.id));
              });
              return next;
            })
          }
          rowState={(r) => ({ muted: skipped(r.id), disabled: locked })}
          phoneSub={(r) => (
            <>
              {r.detail}
              <br />
              {r.figures}
            </>
          )}
          stickyHeader={false}
        />
      </Card>
    </div>
  );
}

export interface CasTableProps {
  rows: ImportRow[];
  rowStates: RowStates;
  setRowStates: SetRowStates;
  locked: boolean;
}

/** The statement's transactions: rows with an error or no instrument first, each with an include box and its mapping. */
export function CasTable({ rows: importRows, rowStates, setRowStates, locked }: CasTableProps) {
  const rows = React.useMemo(() => sortCasRows(importRows).map(casRow), [importRows]);
  const skipped = (id: string) => Boolean(rowStates[Number(id)]?.skip);
  // A row the file could not read stays excluded.
  const unreadable = React.useMemo(() => new Set(rows.filter((r) => r.error).map((r) => r.rowIndex)), [rows]);

  const mapping = (row: CasRow) =>
    row.error ? (
      <Text variant="body" tone="danger" as="span">
        {row.error}
      </Text>
    ) : (
      <MappingCell
        label={row.name}
        matchedName={row.row.matchedInstrument?.name}
        duplicate={row.row.duplicate}
        state={rowStates[row.rowIndex]}
        type="mutual_fund"
        disabled={locked}
        onMap={(inst) => setRowStates((prev) => mapInstrument(prev, row.rowIndex, inst))}
        onCreateNew={(v) => setRowStates((prev) => setCreateNew(prev, row.rowIndex, v))}
      />
    );

  const columns = [
    cas.display({
      id: 'date',
      header: 'Date',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body">{row.original.date}</Text>,
    }),
    cas.display({
      id: 'side',
      header: 'Type',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3" as="span">
          {row.original.side}
        </Text>
      ),
    }),
    cas.display({
      id: 'scheme',
      header: 'Scheme',
      meta: { size: 'fill', grow: 1, wrap: true, phone: 'main' },
      cell: ({ row }) => (
        <>
          <Text variant="body-strong" as="div">
            {row.original.name}
          </Text>
          <Text variant="label" tone="ink-3" as="div" className="max-desk:hidden">
            {row.original.scrip}
          </Text>
        </>
      ),
    }),
    cas.display({
      id: 'units',
      header: 'Units × NAV',
      meta: { size: 'md', align: 'end', wrap: true, phone: 'amount' },
      cell: ({ row }) => (
        <>
          <Text variant="body-strong" as="div">
            {row.original.unitsNav || row.original.amount}
          </Text>
          {row.original.unitsNav ? (
            <Text variant="label" tone="ink-3" as="div">
              {row.original.amount}
            </Text>
          ) : null}
        </>
      ),
    }),
    cas.display({
      id: 'map',
      header: 'Status / map',
      meta: { size: 'fill', grow: 3, wrap: true, phone: 'hidden' },
      cell: ({ row }) => mapping(row.original),
    }),
  ];

  return (
    <div className="flex flex-col gap-space-8">
      <Text variant="overline" tone="ink-3" as="h3">
        Statement transactions
      </Text>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          selectable
          selectionAlwaysOn
          selection={selectedOf(
            rows.map((r) => r.id),
            skipped,
          )}
          onSelectionChange={(selected) =>
            setRowStates((prev) =>
              applySelection(
                prev,
                rows.map((r) => r.rowIndex),
                selected,
                unreadable,
              ),
            )
          }
          rowState={(r) => ({ muted: skipped(r.id), disabled: locked || unreadable.has(r.rowIndex) })}
          phoneSub={(r) => (
            <div className="flex flex-col gap-space-4">
              <Text variant="caption" tone="ink-3" as="span">
                {[r.date, r.scrip].filter(Boolean).join(' · ')}
              </Text>
              {mapping(r)}
            </div>
          )}
          stickyHeader={false}
        />
      </Card>
    </div>
  );
}
