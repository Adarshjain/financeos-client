'use client';

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
  showToast,
  StatusWord,
  Text,
} from '@/components/ds';
import { watchSession } from '@/lib/authExpiry';
import type { DividendFilters } from '@/lib/investments.types';

import { downloadCsv } from '../downloadCsv';
import { exportDividendsCsv } from './dividendsActions';
import {
  type DividendListRow,
  DIVIDENDS_SIZE_OPTIONS,
  dividendsUrl,
  type DividendsUrlState,
  type FyOption,
  RECEIPT_FILTER_OPTIONS,
  RECEIPT_LABEL,
  TYPE_OPTIONS,
} from './dividendsModel';

const ch = createDataTableColumnHelper<DividendListRow>();

/** The word of a row's receipt status. */
function ReceiptCell({ row }: { row: DividendListRow }) {
  return row.receipt ? <StatusWord tone={row.receipt.tone}>{row.receipt.label}</StatusWord> : null;
}

const money = (value: string, tone?: 'ink-3') => (
  <Text variant="body" tone={tone}>
    <Conceal whole>{value}</Conceal>
  </Text>
);

/** The table's columns; the edit button reports the row it was pressed on. */
function buildColumns(onEdit: (id: string) => void) {
  return [
    ch.display({
      id: 'payDate',
      header: 'Pay date',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3">
          {row.original.payDate}
        </Text>
      ),
    }),
    ch.display({
      id: 'instrument',
      header: 'Instrument',
      meta: { size: 'fill', grow: 2, phone: 'main' },
      cell: ({ row }) => (
        <Text variant="body-strong" truncate>
          {row.original.title}
        </Text>
      ),
    }),
    ch.display({
      id: 'perUnit',
      header: 'Per unit',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => money(row.original.perUnit, 'ink-3'),
    }),
    ch.display({
      id: 'gross',
      header: 'Gross',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => money(row.original.gross),
    }),
    ch.display({
      id: 'tds',
      header: 'TDS',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => money(row.original.tds, 'ink-3'),
    }),
    ch.display({
      id: 'receipt',
      header: 'Receipt',
      meta: { size: 'md', phone: 'status' },
      cell: ({ row }) => <ReceiptCell row={row.original} />,
    }),
    ch.display({
      id: 'net',
      header: 'Net',
      meta: { size: 'sm', align: 'end', phone: 'amount' },
      cell: ({ row }) => (
        <Text variant="body-strong">
          <Conceal whole>{row.original.net}</Conceal>
        </Text>
      ),
    }),
    ch.display({
      id: 'edit',
      header: '',
      meta: { size: 'xs', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Edit ${row.original.title} dividend`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original.id);
          }}
        >
          <Icon name="pencil-simple" size="sm" />
        </Button>
      ),
    }),
  ];
}

export interface DividendsListCardProps {
  state: DividendsUrlState;
  rows: DividendListRow[];
  totalElements: number;
  totalPages: number;
  fyOptions: FyOption[];
  /** The FY the list shows ('all' or a starting year) and the current FY, to keep the default out of the address. */
  fyValue: string;
  currentFy: number;
  brokers: { id: string; name: string }[];
  /** The instrument the list is narrowed to from the holding page, or null. */
  instrumentLabel: string | null;
  /** "Total net ₹3,605 · TDS ₹370", or null when the total is not known. */
  totalsLine: string | null;
  /** The list's filters, for the CSV. */
  exportFilters: DividendFilters;
  onEdit: (id: string) => void;
}

/** The FY, Broker, Receipt status and Type filters over the paged table of payouts, with its total and CSV export. Every control is one URL change. */
export function DividendsListCard({
  state,
  rows,
  totalElements,
  totalPages,
  fyOptions,
  fyValue,
  currentFy,
  brokers,
  instrumentLabel,
  totalsLine,
  exportFilters,
  onEdit,
}: DividendsListCardProps) {
  const router = useRouter();
  const [exporting, setExporting] = React.useState(false);
  const go = (next: Partial<DividendsUrlState>) => router.push(dividendsUrl({ ...state, ...next }), { scroll: false });

  const columns = React.useMemo(() => buildColumns(onEdit), [onEdit]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await watchSession(exportDividendsCsv(exportFilters));
      if (!result.success) throw new Error(result.error.message);
      downloadCsv(result.data.csv, result.data.filename);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to export the dividends', { tone: 'danger' });
    } finally {
      setExporting(false);
    }
  };

  const brokerOptions = [{ value: '', label: 'All brokers' }, ...brokers.map((b) => ({ value: b.id, label: b.name }))];
  const receiptOptions = RECEIPT_FILTER_OPTIONS.map((o) => ({ value: o.value === 'all' ? '' : o.value, label: o.label }));
  const typeOptions = [{ value: '', label: 'All types' }, ...TYPE_OPTIONS];
  const fyLabel = fyOptions.find((o) => o.value === fyValue)?.label ?? 'FY';
  const narrowed = state.broker !== '' || state.type !== '' || state.receipt !== '' || state.instrument !== '';

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="dividends"
      sizeOptions={DIVIDENDS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  const empty = narrowed ? (
    <EmptyState
      compact
      description="No dividends match."
      action={{
        label: 'Clear filters',
        variant: 'link',
        onSelect: () => go({ broker: '', type: '', receipt: '', instrument: '', page: 0 }),
      }}
    />
  ) : state.fy !== 'all' ? (
    <EmptyState
      compact
      description={`No dividends in ${fyLabel}.`}
      action={{ label: 'Show all FYs', variant: 'link', onSelect: () => go({ fy: 'all', page: 0 }) }}
    />
  ) : (
    <EmptyState compact description="No dividends recorded yet." />
  );

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="flex items-center gap-space-8 overflow-x-auto">
        <Select
          value={fyValue}
          options={fyOptions}
          onValueChange={(v) => {
            const value = v as string;
            go({ fy: value === 'all' ? 'all' : Number(value) === currentFy ? null : Number(value), page: 0 });
          }}
          trigger={
            <FilterChip hasDropdown selected className="shrink-0">
              {fyLabel}
            </FilterChip>
          }
        />
        {brokers.length > 0 ? (
          <Select
            value={state.broker}
            options={brokerOptions}
            onValueChange={(v) => go({ broker: v as string, page: 0 })}
            trigger={
              <FilterChip hasDropdown selected={state.broker !== ''} className="shrink-0">
                {brokers.find((b) => b.id === state.broker)?.name ?? 'All brokers'}
              </FilterChip>
            }
          />
        ) : null}
        <Select
          value={state.receipt}
          options={receiptOptions}
          onValueChange={(v) => go({ receipt: v as DividendsUrlState['receipt'], page: 0 })}
          trigger={
            <FilterChip hasDropdown selected={state.receipt !== ''} className="shrink-0">
              {state.receipt ? RECEIPT_LABEL[state.receipt] : 'Receipt status'}
            </FilterChip>
          }
        />
        <Select
          value={state.type}
          options={typeOptions}
          onValueChange={(v) => go({ type: v as DividendsUrlState['type'], page: 0 })}
          trigger={
            <FilterChip hasDropdown selected={state.type !== ''} className="shrink-0">
              {TYPE_OPTIONS.find((t) => t.value === state.type)?.label ?? 'Type'}
            </FilterChip>
          }
        />
        {instrumentLabel ? (
          <FilterChip selected removable className="shrink-0" onRemove={() => go({ instrument: '', page: 0 })}>
            {`Showing ${instrumentLabel}`}
          </FilterChip>
        ) : null}
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) => (
            <Text variant="label" tone="ink-3" as="div">
              {[row.payDay, row.unitsLine, row.tdsLine, row.account, row.noBankNote].filter(Boolean).join(' · ')}
              {row.canLink ? (
                <>
                  {' · '}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row.id);
                    }}
                  >
                    link a bank credit
                  </Button>
                </>
              ) : null}
            </Text>
          )}
          onRowSelect={(row) => onEdit(row.id)}
          footer={
            rows.length > 0 ? (
              <div className="flex items-center justify-between gap-space-12 px-space-16 py-space-10">
                {totalsLine ? (
                  <Text variant="caption" tone="ink-3" as="p">
                    {totalsLine}
                  </Text>
                ) : (
                  <span />
                )}
                <Text variant="label" as="span">
                  <Button variant="link" size="sm" loading={exporting} onClick={() => void exportCsv()}>
                    Export CSV
                  </Button>
                </Text>
              </div>
            ) : undefined
          }
          empty={empty}
          stickyHeader={false}
        />
      </Card>
    </div>
  );
}

/** The table while the page loads. */
export function DividendsListSkeleton() {
  return (
    <Card>
      <DataTable columns={buildColumns(() => undefined)} data={[]} getRowId={(row) => row.id} loading skeletonRows={5} />
    </Card>
  );
}
