'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  Conceal,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Icon,
  Pager,
  Select,
  type SelectOption,
  showToast,
  Text,
} from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import { useSearchText } from '@/features/shell/useSearchText';
import type { Broker } from '@/lib/account.types';
import { watchSession } from '@/lib/authExpiry';
import type { FnoSummary } from '@/lib/investments.types';
import { AccountType, type FnoTradeResponse } from '@/lib/types';

import { downloadCsv } from '../downloadCsv';
import { exportFnoCsv } from './fnoActions';
import {
  CONTRACT_CHIPS,
  currentFy,
  FNO_ALL_YEARS,
  FNO_PAGE_SIZE_LABEL,
  FNO_SIZE_OPTIONS,
  fnoFyLabel,
  type FnoListRow,
  fnoListRow,
  fnoUrl,
  type FnoUrlState,
  fyOptions,
  realisedLine,
  SORT_OPTIONS,
} from './fnoModel';
import { FnoTradeDialog } from './FnoTradeDialog';

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];
const ALL_BROKERS: SelectOption[] = [{ value: '', label: 'All brokers' }];

const ch = createDataTableColumnHelper<FnoListRow>();

function Plain({ children, tone }: { children: React.ReactNode; tone?: 'ink-3' }) {
  return (
    <Text variant="body" tone={tone}>
      <Conceal whole>{children}</Conceal>
    </Text>
  );
}

const columns = [
  ch.display({
    id: 'contract',
    header: 'Contract',
    meta: { size: 'fill', grow: 2, wrap: true, phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        <Text variant="body-strong" as="span">
          {row.original.contract}
        </Text>
        {row.original.expiry ? (
          <Text variant="body" tone="ink-3" as="span">
            {` · ${row.original.expiry}`}
          </Text>
        ) : null}
      </Text>
    ),
  }),
  ch.display({
    id: 'type',
    header: 'Type',
    meta: { size: 'md', phone: 'status' },
    cell: ({ row }) => <Badge tone={row.original.typeTone}>{row.original.type}</Badge>,
  }),
  ch.display({
    id: 'strike',
    header: 'Strike',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.strike ?? '—'}</Text>,
  }),
  ch.display({
    id: 'qty',
    header: 'Qty',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.qty}</Text>,
  }),
  ch.display({
    id: 'bought',
    header: 'Bought',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body-strong">
        <Conceal whole>{row.original.bought}</Conceal>
      </Text>
    ),
  }),
  ch.display({
    id: 'sold',
    header: 'Sold',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body-strong">
        <Conceal whole>{row.original.sold}</Conceal>
      </Text>
    ),
  }),
  ch.display({
    id: 'charges',
    header: 'Charges',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Plain tone="ink-3">{row.original.charges}</Plain>,
  }),
  ch.display({
    id: 'pnl',
    header: 'P&L',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong" tone={row.original.pnlTone}>
        <span className="desk:hidden">
          <Conceal whole>{row.original.pnl}</Conceal>
        </span>
        <span className="max-desk:hidden">
          <Conceal whole>{row.original.pnlPlain}</Conceal>
        </span>
      </Text>
    ),
  }),
  ch.display({
    id: 'source',
    header: 'Source',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.source}
      </Text>
    ),
  }),
  ch.display({
    id: 'edit',
    header: '',
    meta: { size: 'xs', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${row.original.contract}`}>
        <Icon name="pencil-simple" size="sm" />
      </Button>
    ),
  }),
];

export interface FnoListCardProps {
  state: FnoUrlState;
  trades: FnoTradeResponse[];
  totalElements: number;
  totalPages: number;
  /** The broker accounts, for the Broker filter and the edit form. */
  brokers: Pick<Broker, 'id' | 'name' | 'clientId'>[];
  /** The year's summary, for the line under the list; null when it failed. */
  summary: FnoSummary | null;
}

/** The symbol search, contract chips, Broker, FY and sort over the paged trades. Every control is one URL change. */
export function FnoListCard({ state, trades, totalElements, totalPages, brokers, summary }: FnoListCardProps) {
  const router = useRouter();
  const go = (next: Partial<FnoUrlState>) => router.push(fnoUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  const [editing, setEditing] = React.useState<FnoTradeResponse | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const rows = React.useMemo(() => trades.map(fnoListRow), [trades]);
  const byId = React.useMemo(() => new Map(trades.map((t) => [t.id, t])), [trades]);

  const brokerAccounts = React.useMemo(() => brokers.map((b) => ({ id: b.id, name: b.name, type: AccountType.BROKER })), [brokers]);
  const brokerName = brokers.find((b) => b.id === state.broker)?.name;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === state.sort)?.label ?? SORT_OPTIONS[0].label;

  const exportForItr = async () => {
    setExporting(true);
    if (state.fy == null) return;
    const result = await watchSession(exportFnoCsv(state.fy));
    setExporting(false);
    if (!result.success) {
      showToast(result.error.message, { tone: 'danger' });
      return;
    }
    downloadCsv(result.data.csv, result.data.filename);
  };

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="trades"
      sizeOptions={FNO_SIZE_OPTIONS}
      sizeLabel={FNO_PAGE_SIZE_LABEL}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  const filtered = state.q !== '' || state.contract !== '' || state.broker !== '';

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <FilterBar search={{ value: text, onValueChange: setText }}>
        {CONTRACT_CHIPS.map((chip) => (
          <FilterChip
            key={chip.value || 'all'}
            className="shrink-0"
            selected={state.contract === chip.value}
            onClick={() => go({ contract: chip.value, page: 0 })}
          >
            {chip.label}
          </FilterChip>
        ))}
        {brokers.length > 0 ? (
          <AccountPicker
            accounts={brokerAccounts}
            types={BROKER_TYPES}
            leadingOptions={ALL_BROKERS}
            value={state.broker}
            onValueChange={(v) => go({ broker: v ?? '', page: 0 })}
            trigger={
              <FilterChip hasDropdown selected={state.broker !== ''} className="shrink-0">
                {brokerName ?? 'Broker'}
              </FilterChip>
            }
          />
        ) : null}
        <Select
          value={state.fy == null ? '' : String(state.fy)}
          options={[FNO_ALL_YEARS, ...fyOptions(state.fy ?? currentFy())]}
          onValueChange={(v) => go({ fy: v === '' ? null : Number(v), page: 0 })}
          trigger={
            <FilterChip hasDropdown className="shrink-0">
              {fnoFyLabel(state.fy)}
            </FilterChip>
          }
        />
        <div className="shrink-0 ml-auto">
          <Select
            value={state.sort}
            options={SORT_OPTIONS}
            onValueChange={(v) => go({ sort: v as FnoUrlState['sort'], page: 0 })}
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
          phoneSub={(row) => (
            <Text variant="label" tone="ink-3">
              <Conceal>{row.line}</Conceal>
            </Text>
          )}
          onRowSelect={(row) => setEditing(byId.get(row.id) ?? null)}
          footer={
            rows.length > 0 ? (
              <div className="flex flex-col items-start gap-space-4 px-space-16 py-space-10 desk:flex-row desk:items-center desk:justify-between desk:gap-space-12">
                {summary ? (
                  <Text variant="caption" tone="ink-3" as="p">
                    <Conceal>{realisedLine(summary)}</Conceal>
                  </Text>
                ) : (
                  <span />
                )}
                {state.fy != null ? (
                  <Text variant="label" as="span">
                    <Button variant="link" size="sm" loading={exporting} onClick={() => void exportForItr()}>
                      Export for ITR
                    </Button>
                  </Text>
                ) : null}
              </div>
            ) : undefined
          }
          empty={
            <EmptyState
              compact
              description={
                filtered
                  ? 'No trades match.'
                  : `No F&O trades${state.fy == null ? '' : ` in ${fnoFyLabel(state.fy)}`}. Log a trade or import a broker Tax P&L statement.`
              }
              action={
                filtered
                  ? {
                      label: 'Clear filters',
                      variant: 'link',
                      onSelect: () => router.push(fnoUrl({ ...state, q: '', contract: '', broker: '', page: 0 })),
                    }
                  : undefined
              }
            />
          }
          stickyHeader={false}
        />
      </Card>
      {editing ? <FnoTradeDialog trade={editing} brokers={brokers} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** The list while the page loads. */
export function FnoListSkeleton() {
  return (
    <Card>
      <DataTable columns={columns} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
    </Card>
  );
}
