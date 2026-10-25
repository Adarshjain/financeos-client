'use client';

// A row breakdown on its own (a widget's account balance, a holding…), the Dinero version of the Legacy
// RowBreakdownDialog: how one row's value is made up — header and total, the arithmetic as steps, then each
// section as a server-paged, server-sorted table. A section's rows open a nested breakdown on top (Back returns
// a level; the root has no Back) or, with `onOpenTransaction`, a transaction. The dialog is open while it is
// mounted, like ReportUnderlyingDialog; each opening starts at the root.

import React from 'react';

import {
  Banner,
  Button,
  createDataTableColumnHelper,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  EmptyState,
  FilterChip,
  Icon,
  ListRow,
  Pager,
  Select,
  Skeleton,
  Text,
} from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { asReportData, isRawTableData } from '@/lib/reports.helpers';
import type { SortClause } from '@/lib/reports.types';

import { type BreakdownRowHandlers, rowClickHandler } from './breakdownRows';
import { cellText, mainIndexOf } from './ReportUnderlyingDialog';
import { formatAmount, UNDERLYING_PAGE_SIZE } from './underlying.helpers';
import type { BreakdownSectionData, BreakdownStep } from './underlying.types';
import { useBreakdownStack } from './useBreakdownStack';
import { useBreakdownSection, useRowBreakdown } from './useRowBreakdown';

export interface ReportRowBreakdownDialogProps {
  /** The datasource whose row is broken down (e.g. `net_worth`, `positions`). */
  datasource: string;
  /** The row's id within that datasource. */
  rowId: string;
  /** Dialog title (the widget's or the row's name). */
  title: string;
  /** A transaction row was pressed; without it transaction rows do nothing. */
  onOpenTransaction?: (id: string) => void;
  onClose: () => void;
}

export function ReportRowBreakdownDialog({ datasource, rowId, title, onOpenTransaction, onClose }: ReportRowBreakdownDialogProps) {
  const nav = useBreakdownStack([{ datasource, rowId }]);
  // The root frame is never popped (it has no Back), so `top` is always set.
  const top = nav.top ?? { datasource, rowId };
  const nested = nav.stack.length > 1;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl" title={title} secondary={{ label: 'Close', onSelect: onClose }}>
        <DialogBody>
          <BreakdownFrameView
            key={`${nav.stack.length}:${top.rowId}`}
            datasource={top.datasource}
            rowId={top.rowId}
            onBack={nested ? nav.pop : undefined}
            onOpenTransaction={onOpenTransaction ?? (() => undefined)}
            onOpenBreakdown={nav.push}
            transactionsOpen={onOpenTransaction !== undefined}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

interface FrameProps extends BreakdownRowHandlers {
  datasource: string;
  rowId: string;
  onBack?: () => void;
  transactionsOpen: boolean;
}

function BreakdownFrameView({ datasource, rowId, onBack, transactionsOpen, onOpenTransaction, onOpenBreakdown }: FrameProps) {
  const query = useRowBreakdown(datasource, rowId);
  const data = query.data;

  return (
    <div className="flex flex-col gap-space-16">
      {onBack ? (
        <div>
          <Button variant="ghost" size="sm" icon={<Icon name="chevron-left" />} onClick={onBack}>
            Back
          </Button>
        </div>
      ) : null}

      {query.error ? (
        <Banner tone="danger" title="Could not load the breakdown">
          {getErrorMessage(query.error, 'Try again in a moment.')}
        </Banner>
      ) : !data ? (
        <div className="flex flex-col gap-space-8" data-testid="breakdown-loading">
          <Skeleton height={32} />
          <Skeleton height={160} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-space-4">
            <Text variant="heading">{data.title}</Text>
            {data.subtitle || data.kindLabel ? (
              <Text variant="caption" tone="ink-3">
                {[data.subtitle, data.kindLabel].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Text variant="body">
              {data.totalLabel} <Text as="span" variant="body-strong">{formatAmount(data.total, data.format)}</Text>
            </Text>
          </div>

          {/* An item the datasource's total leaves out (e.g. an excluded or closed account): explained, not counted. */}
          {data.notCounted ? (
            <Banner tone="info" title="Left out of the total">
              <span data-testid="breakdown-not-counted">
                {data.notCountedReason ? `${data.notCountedReason} — ` : ''}shown for reference, left out of the total.
              </span>
            </Banner>
          ) : null}

          {data.steps.length > 0 ? (
            <div data-testid="breakdown-steps">
              {data.steps.map((step, i) => (
                <StepRow key={`${step.op}-${i}`} step={step} />
              ))}
            </div>
          ) : null}

          {data.sections.map((section) => (
            <SectionTable
              key={section.key}
              datasource={data.datasource}
              rowId={data.rowId}
              section={section}
              handlers={{ onOpenTransaction, onOpenBreakdown }}
              transactionsOpen={transactionsOpen}
            />
          ))}

          {data.notes.length > 0 ? (
            <ul className="flex flex-col gap-space-4">
              {data.notes.map((note) => (
                <li key={note}>
                  <Text variant="caption" tone="ink-3">{note}</Text>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

const SIGNS: Record<string, string> = { add: '+', subtract: '−', equals: '=' };

/** One term of the arithmetic: sign, label (with detail), amount. "info" steps are muted facts outside the sum. */
function StepRow({ step }: { step: BreakdownStep }) {
  const info = step.op === 'info';
  return (
    <ListRow
      data-op={step.op}
      leading={<Text variant="body-strong" tone="ink-3">{SIGNS[step.op] ?? ''}</Text>}
      title={<Text variant={step.op === 'equals' ? 'body-strong' : 'body'} tone={info ? 'ink-3' : 'ink'}>{step.label}</Text>}
      subtitle={step.detail ?? undefined}
      trailing={
        step.amount != null ? (
          <Text variant={step.op === 'equals' ? 'body-strong' : 'body'} tone={info ? 'ink-3' : 'ink'}>
            {formatAmount(step.amount, step.format)}
          </Text>
        ) : undefined
      }
      wrap
    />
  );
}

type Row = Record<string, unknown> & { __row: string };
const ch = createDataTableColumnHelper<Row>();
const DEFAULT_SORT = 'default';

function SectionTable({
  datasource,
  rowId,
  section,
  handlers,
  transactionsOpen,
}: {
  datasource: string;
  rowId: string;
  section: BreakdownSectionData;
  handlers: BreakdownRowHandlers;
  transactionsOpen: boolean;
}) {
  const first = asReportData(section.table);
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState<SortClause | null>(null);
  const size = isRawTableData(first) ? first.page.size : UNDERLYING_PAGE_SIZE;
  // Page 0 unsorted comes with the breakdown; later pages and sorts come from the section endpoint.
  const embedded = page === 0 && sort == null;
  const later = useBreakdownSection(datasource, rowId, section.key, page, size, sort);
  const current = embedded ? first : later.data;
  // The last page shown stays up (busy) while the next page or sort loads and under an error, so the pager never unmounts mid-click.
  const [lastShown, setLastShown] = React.useState(first);
  if (current && current !== lastShown) setLastShown(current);
  const table = current ?? lastShown;
  const raw = isRawTableData(table) ? table : null;
  const pageError = embedded ? null : later.error;

  const columns = React.useMemo(() => {
    if (!raw) return [];
    const mainIndex = mainIndexOf(raw.columns);
    return raw.columns.map((c, i) =>
      ch.accessor((row: Row) => row[c.key] as unknown, {
        id: c.key,
        header: c.label,
        meta: {
          size: c.type === 'date' ? 'sm' : i === mainIndex ? 'fill' : 'md',
          grow: i === mainIndex ? 2 : undefined,
          align: c.type === 'number' ? 'end' : 'start',
          phone: c.type === 'number' ? 'amount' : i === mainIndex ? 'main' : 'hidden',
        },
        cell: ({ row }) => (
          <Text variant={c.type === 'number' ? 'body-strong' : 'body'} truncate>
            {cellText(row.original[c.key], c)}
          </Text>
        ),
      }),
    );
  }, [raw]);

  const rows = React.useMemo<Row[]>(
    () => (raw ? raw.rows.map((r, i) => ({ ...r, __row: String(r.id ?? `${raw.page.number}-${i}`) })) : []),
    [raw],
  );

  const onRowClick = rowClickHandler(section, handlers);
  const pressable = section.rowAction === 'transaction' ? transactionsOpen && onRowClick : onRowClick;

  const changeSort = (value: string | string[]) => {
    const [key, direction] = String(value).split(',');
    setSort(value === DEFAULT_SORT ? null : { key, direction: direction as SortClause['direction'] });
    setPage(0);
  };
  // After a failed page the pager shows the last good page, so asking for the failed page again is a retry.
  const changePage = (next: number) => {
    if (next === page && pageError) void later.refetch();
    else setPage(next);
  };

  const sortOptions = [
    { value: DEFAULT_SORT, label: 'Default order' },
    ...(raw?.columns ?? []).flatMap((c) => [
      { value: `${c.key},desc`, label: `${c.label} (descending)` },
      { value: `${c.key},asc`, label: `${c.label} (ascending)` },
    ]),
  ];
  const sortedColumn = sort ? raw?.columns.find((c) => c.key === sort.key) : null;

  return (
    <section className="flex flex-col gap-space-8" aria-label={section.label}>
      <div className="flex items-center justify-between gap-space-8">
        <Text variant="overline" tone="ink-3">{section.label}</Text>
        {raw ? (
          <Select
            value={sort ? `${sort.key},${sort.direction}` : DEFAULT_SORT}
            options={sortOptions}
            onValueChange={changeSort}
            trigger={
              <FilterChip hasDropdown selected={sort !== null}>
                {sortedColumn ? `Sort: ${sortedColumn.label.toLowerCase()}` : 'Sort'}
              </FilterChip>
            }
          />
        ) : null}
      </div>
      {raw ? (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.__row}
          busy={later.isFetching}
          onRowSelect={pressable ? (row) => pressable({ ...row }) : undefined}
          pager={
            raw.page.totalPages > 1 ? (
              <Pager
                variant="compact"
                page={raw.page.number}
                size={raw.page.size}
                totalElements={raw.page.totalElements}
                totalPages={raw.page.totalPages}
                unit="rows"
                onPageChange={changePage}
              />
            ) : undefined
          }
          empty={<EmptyState compact description="Nothing here." />}
        />
      ) : (
        <Skeleton height={96} />
      )}
      {pageError ? (
        <Banner tone="danger" title="Could not load this page">
          {getErrorMessage(pageError, 'Try again in a moment.')}
        </Banner>
      ) : null}
    </section>
  );
}
