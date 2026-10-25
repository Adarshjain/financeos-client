'use client';

import Link from 'next/link';
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
  FilterChip,
  Icon,
  Pager,
  Select,
  Text,
  TextField,
} from '@/components/ds';
import { useSearchText } from '@/features/shell/useSearchText';

import { jobHref } from '../holdings/PricesLine';
import {
  currentFy,
  fyOptions,
  isTradebookFiltered,
  TRADEBOOK_SIZE_OPTIONS,
  type TradebookJobLine,
  type TradebookRow,
  tradebookUrl,
  type TradebookUrlState,
} from './tradebookModel';
import { EditTradeDialog } from './TradeDialog';

const ch = createDataTableColumnHelper<TradebookRow>();

/** The phone's second line: "1 Oct · 50 @ ₹710 · realised −₹13,500 · delivery". */
function PhoneSub({ row }: { row: TradebookRow }) {
  const { date, position, realised, settlement } = row.sub;
  return (
    <Text variant="label" tone="ink-3" truncate>
      <Conceal>
        {`${date} · ${position}`}
        {realised ? (
          <>
            {' · '}
            <Text variant="label" tone={realised.tone ?? 'ink-3'} as="span">
              {realised.text}
            </Text>
          </>
        ) : null}
        {settlement ? ` · ${settlement}` : null}
      </Conceal>
    </Text>
  );
}

function columnsFor(onEdit: (row: TradebookRow) => void) {
  return [
    ch.display({
      id: 'date',
      header: 'Date',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body">{row.original.date}</Text>,
    }),
    ch.display({
      id: 'instrument',
      header: 'Instrument',
      meta: { size: 'fill', grow: 2, phone: 'main' },
      cell: ({ row }) => (
        <Text variant="body" truncate>
          <Text variant="body-strong" as="span">
            {row.original.title}
          </Text>
          <Text variant="body" tone="ink-3" as="span">
            {` · ${row.original.broker}`}
          </Text>
        </Text>
      ),
    }),
    ch.display({
      id: 'type',
      header: 'Type',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => <Badge tone={row.original.side === 'Buy' ? 'success' : 'danger'}>{row.original.side}</Badge>,
    }),
    ch.display({
      id: 'settlement',
      header: 'Settlement',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.settlement === '—' ? 'ink-3' : undefined}>
          {row.original.settlement}
        </Text>
      ),
    }),
    ch.display({
      id: 'qty',
      header: 'Qty',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body-strong">
          <Conceal whole>{row.original.quantity}</Conceal>
        </Text>
      ),
    }),
    ch.display({
      id: 'price',
      header: 'Price',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body">
          <Conceal whole>{row.original.pricePlain}</Conceal>
        </Text>
      ),
    }),
    ch.display({
      id: 'value',
      header: 'Value',
      meta: { size: 'sm', align: 'end', phone: 'amount' },
      cell: ({ row }) => (
        <Text variant="body-strong">
          <span className="desk:hidden">
            <Conceal whole>{row.original.value}</Conceal>
          </span>
          <span className="max-desk:hidden">
            <Conceal whole>{row.original.valuePlain}</Conceal>
          </span>
        </Text>
      ),
    }),
    ch.display({
      id: 'charges',
      header: 'Charges',
      meta: { size: 'sm', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3">
          <Conceal whole>{row.original.chargesPlain === '0' ? '0' : `≈${row.original.chargesPlain}`}</Conceal>
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
          aria-label={`Edit ${row.original.title} trade`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Icon name="pencil-simple" size="sm" />
        </Button>
      ),
    }),
  ];
}

/** "Last import 13 Oct, 11:02 · 14 trades · View job · Last reconcile 13 Oct, 11:04 · View job": each View job is a permanent link to that exact job. */
export function JobsLine({ lines }: { lines: (TradebookJobLine | null)[] }) {
  const shown = lines.filter((l): l is TradebookJobLine => l !== null);
  if (shown.length === 0) return null;
  return (
    <Text variant="caption" tone="ink-3" as="div">
      {shown.map((line, i) => (
        <React.Fragment key={line.jobId}>
          {i > 0 ? ' · ' : null}
          {`${line.text} · `}
          <Button asChild variant="link" size="sm">
            <Link href={jobHref(line.jobId)}>View job</Link>
          </Button>
        </React.Fragment>
      ))}
    </Text>
  );
}

export interface TradebookViewProps {
  state: TradebookUrlState;
  rows: TradebookRow[];
  totalElements: number;
  totalPages: number;
  brokers: { id: string; name: string }[];
  /** Today (YYYY-MM-DD), for the FY choices. */
  today: string;
  jobLines: (TradebookJobLine | null)[];
}

/** The search, broker, side and FY controls over the paged tradebook. Every control is one URL change, answered by the server. */
export function TradebookView({ state, rows, totalElements, totalPages, brokers, today, jobLines }: TradebookViewProps) {
  const router = useRouter();
  const go = (next: Partial<TradebookUrlState>) => router.push(tradebookUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  const [editing, setEditing] = React.useState<TradebookRow | null>(null);
  const columns = React.useMemo(() => columnsFor(setEditing), []);

  const fyChoices = fyOptions(today, state.fy);
  const fyText = fyChoices.find((o) => o.value === (state.fy == null ? '' : String(state.fy)))?.label ?? 'All years';

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="trades"
      sizeOptions={TRADEBOOK_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  const filtered = isTradebookFiltered(state);
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <JobsLine lines={jobLines} />
      <div className="flex flex-col desk:flex-row desk:items-center gap-space-8">
        <TextField
          type="search"
          size="md"
          className="desk:flex-1 desk:max-w-container-sm"
          prefix={<Icon name="search" size="sm" />}
          clearable
          clearLabel="Clear search"
          placeholder="Instrument"
          value={text}
          onValueChange={setText}
        />
        <div className="flex items-center gap-space-8 overflow-x-auto">
          <FilterChip className="shrink-0" selected={state.broker === ''} onClick={() => go({ broker: '', page: 0 })}>
            All brokers
          </FilterChip>
          {brokers.map((b) => (
            <FilterChip key={b.id} className="shrink-0" selected={state.broker === b.id} onClick={() => go({ broker: b.id, page: 0 })}>
              {b.name}
            </FilterChip>
          ))}
          <FilterChip className="shrink-0" selected={state.type === 'buy'} onClick={() => go({ type: state.type === 'buy' ? '' : 'buy', page: 0 })}>
            Buy
          </FilterChip>
          <FilterChip className="shrink-0" selected={state.type === 'sell'} onClick={() => go({ type: state.type === 'sell' ? '' : 'sell', page: 0 })}>
            Sell
          </FilterChip>
          <Select
            value={state.fy == null ? '' : String(state.fy)}
            options={fyChoices}
            onValueChange={(v) => go({ fy: v === '' ? null : Number(v), page: 0 })}
            trigger={
              <FilterChip hasDropdown selected={state.fy !== currentFy()} className="shrink-0">
                {fyText}
              </FilterChip>
            }
          />
        </div>
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) => <PhoneSub row={row} />}
          onRowSelect={(row) => setEditing(row)}
          empty={
            <EmptyState
              compact
              description={filtered ? 'No trades match.' : 'No trades recorded. Record a trade or import your tradebook.'}
              action={filtered ? { label: 'Clear filters', variant: 'link', onSelect: () => router.push(tradebookUrl({ ...state, q: '', broker: '', type: '', fy: currentFy(), page: 0 })) } : undefined}
            />
          }
          stickyHeader={false}
        />
      </Card>
      {editing ? <EditTradeDialog key={editing.id} trade={editing.raw} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** The table while the page loads. */
export function TradebookSkeleton() {
  return (
    <Card>
      <DataTable columns={columnsFor(() => undefined)} data={[]} getRowId={(row) => row.id} loading skeletonRows={10} />
    </Card>
  );
}
