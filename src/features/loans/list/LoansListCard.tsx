'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Icon,
  Pager,
  ProgressBar,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { closedBand, ClosedFooter, mutedWhenClosed } from '@/features/accounts/list/AccountsSections';
import { useSearchText } from '@/features/shell/useSearchText';
import { RowTransition, SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

import { loadClosedLoans } from './closedLoansAction';
import {
  type LoanRow,
  LOANS_SIZE_OPTIONS,
  loansUrl,
  type LoansUrlState,
} from './loansList';

const ch = createDataTableColumnHelper<LoanRow>();

const columns = [
  ch.display({
    id: 'loan',
    header: 'Loan',
    meta: { size: 'fill', grow: 1.5, phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body" truncate>
        <SharedName name={transitionName.loan(row.original.id)}>
          <Text variant="body-strong" as="span">
            {row.original.name}
          </Text>
        </SharedName>
        <Text variant="body" tone="ink-3" as="span">
          {`${row.original.lender ? ` · ${row.original.lender}` : ''} · ${row.original.kind}`}
        </Text>
      </Text>
    ),
  }),
  ch.display({
    id: 'rate',
    header: 'Rate',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.rate}</Text>,
  }),
  ch.display({
    id: 'emi',
    header: 'EMI',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.emi}</Text>,
  }),
  ch.display({
    id: 'outstanding',
    header: 'Outstanding',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.outstanding}</Text>,
  }),
  ch.display({
    id: 'progress',
    header: 'Progress',
    meta: { size: 'lg', phone: 'hidden', wrap: true },
    cell: ({ row }) => (
      <div className="flex flex-col gap-space-4 w-full">
        <ProgressBar value={row.original.progressPct} />
        <Text variant="caption" tone="ink-3">
          {row.original.progressText}
        </Text>
      </div>
    ),
  }),
  ch.display({
    id: 'next',
    header: 'Next',
    meta: { size: 'md', phone: 'status' },
    cell: ({ row }) => {
      const next = row.original.next;
      if (next.kind === 'overdue') return <Badge tone="danger">{next.label}</Badge>;
      if (next.kind === 'status') return <Badge tone="neutral">{next.label}</Badge>;
      if (next.kind === 'none') return <Text variant="body" tone="ink-3">—</Text>;
      return <Text variant="body">{next.label}</Text>;
    },
  }),
  ch.display({
    id: 'open',
    header: '',
    meta: { size: 'xs', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" iconOnly aria-label={`Open ${row.original.name}`}>
        <Link href={row.original.href} prefetch={false}>
          <Icon name="chevron-right" size="sm" />
        </Link>
      </Button>
    ),
  }),
];

export interface LoansListCardProps {
  state: LoansUrlState;
  rows: LoanRow[];
  totalElements: number;
  totalPages: number;
  /** Closed and foreclosed loans, for the "Closed · n · Show" line. */
  closedLine: string | null;
}

/** The loans table under its search. Closed loans load into place when "Show" is pressed. */
export function LoansListCard({ state, rows, totalElements, totalPages, closedLine }: LoansListCardProps) {
  const router = useRouter();
  const go = (next: Partial<LoansUrlState>) => router.push(loansUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));
  // The closed rows belong to the search and the server data they were loaded for: a new search or a
  // refresh (new `rows` from the server) makes them stale, and while they are shown they load again.
  const [closed, setClosed] = React.useState<{ q: string; source: LoanRow[]; rows: LoanRow[] } | null>(null);
  // The search the closed loans were asked for: a new search puts the line back to "Show".
  const [askedFor, setAskedFor] = React.useState<string | null>(null);
  const wantClosed = askedFor === state.q;
  const setWantClosed = (want: boolean) => setAskedFor(want ? state.q : null);
  const loaded = closed && closed.q === state.q && closed.source === rows ? closed.rows : null;
  const showing = wantClosed && loaded !== null;
  const inflight = React.useRef<string | null>(null);
  const requestId = `${state.q}|${rows.length}|${state.page}`;

  React.useEffect(() => {
    if (!wantClosed || loaded || inflight.current === requestId) return;
    inflight.current = requestId;
    void loadClosedLoans(state.q).then((result) => {
      inflight.current = null;
      if (!result.success) {
        showToast(result.error.message, { tone: 'danger' });
        setWantClosed(false);
        return;
      }
      if (result.data.length === 0) {
        showToast('No closed loans match.');
        setWantClosed(false);
        return;
      }
      setClosed({ q: state.q, source: rows, rows: result.data });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantClosed, loaded, requestId, state.q, rows]);

  const toggle = () => setWantClosed(!wantClosed);

  const visible = showing && loaded ? [...rows, ...loaded] : rows;

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="loans"
      sizeOptions={LOANS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <TextField
        type="search"
        size="md"
        className="desk:w-container-xs"
        prefix={<Icon name="search" size="sm" />}
        clearable
        clearLabel="Clear search"
        placeholder="Search loans"
        value={text}
        onValueChange={setText}
      />
      <Card>
        <DataTable
          columns={columns}
          data={visible}
          getRowId={(row) => row.id}
          wrapRow={(row, node) => <RowTransition key={row.id}>{node}</RowTransition>}
          pager={pager}
          rowState={mutedWhenClosed}
          band={closedBand<LoanRow>(closedLine, toggle)}
          phoneSub={(row) => row.phoneSub}
          onRowSelect={(row) => router.push(row.href)}
          empty={
            <EmptyState
              compact
              description={state.q ? 'No loans match.' : 'No loans yet. Add a loan to track its EMIs.'}
              action={state.q ? { label: 'Clear filters', variant: 'link', onSelect: () => go({ q: '', page: 0 }) } : undefined}
            />
          }
          stickyHeader={false}
        />
        <ClosedFooter line={closedLine} showing={showing} onToggle={toggle} />
      </Card>
    </div>
  );
}

/** The loans table while the page loads. */
export function LoansListSkeleton() {
  return (
    <Card>
      <DataTable columns={columns} data={[]} getRowId={(row) => row.id} loading skeletonRows={5} />
    </Card>
  );
}
