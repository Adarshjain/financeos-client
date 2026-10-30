'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Hero } from '@/components/ds/Hero/Hero';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { AppError } from '@/lib/appError';
import { watchSession } from '@/lib/authExpiry';
import { downloadCsv } from '@/lib/downloadCsv';
import type { DividendFilters } from '@/lib/investments.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { AccountType } from '@/lib/types';

import { FilterRowSkeleton } from '../FilterRowSkeleton';
import { loadDividendAddDialog } from '../lazyDialogs';
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

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];
const ALL_BROKERS: SelectOption[] = [{ value: '', label: 'All brokers' }];

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

/** The table's columns; a row tap opens the edit dialog. */
function buildColumns() {
  return [
    ch.display({
      id: 'payDate',
      header: 'Pay date',
      meta: { size: 'date', phone: 'hidden' },
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
  const [adding, setAdding] = React.useState(false);
  const { Component: DividendAddDialog, run: runAdd } = useLazyDialog(loadDividendAddDialog);
  const go = (next: Partial<DividendsUrlState>) => router.push(dividendsUrl({ ...state, ...next }), { scroll: false });

  const columns = React.useMemo(() => buildColumns(), []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await watchSession(exportDividendsCsv(exportFilters));
      if (!result.success) throw new AppError(result.error.message);
      downloadCsv(result.data.csv, result.data.filename);
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't export the dividends. Try again."), { tone: 'danger' });
    } finally {
      setExporting(false);
    }
  };

  const brokerAccounts = React.useMemo(() => brokers.map((b) => ({ id: b.id, name: b.name, type: AccountType.BROKER })), [brokers]);
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

  const clearAll = () => go({ fy: null, broker: '', type: '', receipt: '', instrument: '', page: 0 });
  const empty = narrowed ? (
    <EmptyState
      title="No dividends match"
      description="Try different filters."
      action={{ label: 'Clear filters', variant: 'secondary', onSelect: clearAll }}
    />
  ) : state.fy !== 'all' ? (
    <EmptyState
      title={`No dividends in ${fyLabel}`}
      description="Try another year."
      action={{ label: 'Show all FYs', variant: 'secondary', onSelect: () => go({ fy: 'all', page: 0 }) }}
    />
  ) : (
    <EmptyState
      title="No dividends yet"
      description="Record a dividend to see what you have received."
      action={{ label: 'Record dividend', variant: 'primary', onSelect: () => void runAdd(() => setAdding(true)) }}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar changed={narrowed || state.fy !== null} onReset={clearAll}>
        <Select
          value={fyValue}
          options={fyOptions}
          onValueChange={(v) => {
            const value = v as string;
            go({ fy: value === 'all' ? 'all' : Number(value) === currentFy ? null : Number(value), page: 0 });
          }}
          trigger={
            <FilterChip hasDropdown changed={state.fy !== null} onReset={() => go({ fy: null, page: 0 })} className="shrink-0">
              {fyLabel}
            </FilterChip>
          }
        />
        {brokers.length > 0 ? (
          <AccountPicker
            accounts={brokerAccounts}
            types={BROKER_TYPES}
            leadingOptions={ALL_BROKERS}
            value={state.broker}
            onValueChange={(v) => go({ broker: v ?? '', page: 0 })}
            trigger={
              <FilterChip hasDropdown changed={state.broker !== ''} onReset={() => go({ broker: '', page: 0 })} className="shrink-0">
                {brokers.find((b) => b.id === state.broker)?.name ?? 'Broker'}
              </FilterChip>
            }
          />
        ) : null}
        <Select
          value={state.receipt}
          options={receiptOptions}
          onValueChange={(v) => go({ receipt: v as DividendsUrlState['receipt'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.receipt !== ''} onReset={() => go({ receipt: '', page: 0 })} className="shrink-0">
              {state.receipt ? RECEIPT_LABEL[state.receipt] : 'Receipt status'}
            </FilterChip>
          }
        />
        <Select
          value={state.type}
          options={typeOptions}
          onValueChange={(v) => go({ type: v as DividendsUrlState['type'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.type !== ''} onReset={() => go({ type: '', page: 0 })} className="shrink-0">
              {TYPE_OPTIONS.find((t) => t.value === state.type)?.label ?? 'Type'}
            </FilterChip>
          }
        />
        {instrumentLabel ? (
          <FilterChip changed onReset={() => go({ instrument: '', page: 0 })} className="shrink-0">
            {instrumentLabel}
          </FilterChip>
        ) : null}
      </FilterBar>
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
    {adding && DividendAddDialog ? <DividendAddDialog onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

/** The hero, filter row and table while the page loads. */
export function DividendsListSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label figures={2} />
      <FilterRowSkeleton chips={4} />
      <Card>
        <DataTable columns={buildColumns()} data={[]} getRowId={(row) => row.id} loading skeletonRows={5} />
      </Card>
    </div>
  );
}
