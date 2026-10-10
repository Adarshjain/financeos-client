'use client';

// A raw table's rows as cards, for phones where a wide table does not fit.
// Each card: the title column on the left, the value column in bold on the
// right, and the remaining columns' values on a muted line underneath (see
// tableCards.helpers). Group headers become section headings carrying the
// group's total. With no column headers to click, a "Sort" select (columns +
// "Default order") and a direction toggle drive the same runtime sort the
// table's headers do. Clickable rows are whole-card buttons.

import { ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortClause, TableData, TableRow } from '@/lib/reports.types';
import { cn } from '@/lib/utils';

import { cardLayout, cardMetaLine } from './tableCards.helpers';
import { TablePagination } from './TablePagination';
import { formatCell, groupLabel, groupTotal } from './TableView';

/** The sort select's value for the report's own order. */
const DEFAULT_ORDER = '__default__';

export interface TableCardListProps {
  data: TableData;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  sort?: SortClause | null;
  /** Shows the Sort select and direction toggle. */
  onSortChange?: (sort: SortClause | null) => void;
  onRowClick?: (row: TableRow) => void;
  /** Groups consecutive rows under a heading per `row[groupField]`; the group column leaves the cards. */
  groupField?: string | null;
  /** Each group's total over the whole data set, keyed by the stored group value. */
  groupTotals?: Record<string, number> | null;
  /** The card's figure; default: the last currency column, else the last number column. */
  valueKey?: string | null;
  /** Leaves the row count out of the pager. */
  hideRowCount?: boolean;
}

interface CardGroup {
  value: unknown;
  start: number;
  rows: TableRow[];
}

/** Consecutive runs of rows sharing a group value (one run when ungrouped). */
function groupRuns(rows: TableRow[], groupField: string | null | undefined): CardGroup[] {
  if (groupField == null) return [{ value: undefined, start: 0, rows }];
  const runs: CardGroup[] = [];
  rows.forEach((row, i) => {
    const last = runs.at(-1);
    if (last && last.value === row[groupField]) last.rows.push(row);
    else runs.push({ value: row[groupField], start: i, rows: [row] });
  });
  return runs;
}

export function TableCardList({
  data,
  onPageChange,
  loading,
  sort,
  onSortChange,
  onRowClick,
  groupField,
  groupTotals,
  valueKey,
  hideRowCount,
}: TableCardListProps) {
  const { rows, page } = data;
  const groupColumn = groupField != null ? data.columns.find((c) => c.key === groupField) : undefined;
  const cardColumns = groupField != null ? data.columns.filter((c) => c.key !== groupField) : data.columns;
  const layout = cardLayout(cardColumns, valueKey);
  const totalColumn = layout.value;
  const multiPage = page.totalElements > page.size || page.number > 0;

  return (
    <div className="space-y-3">
      {onSortChange && <CardSortBar data={data} sort={sort ?? null} onSortChange={onSortChange} />}

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No rows for this configuration.</p>
      ) : (
        groupRuns(rows, groupField).map((group) => {
          const total = groupColumn ? groupTotal(groupTotals, group.value) : undefined;
          const cards = (
            <ul className="space-y-2">
              {group.rows.map((row, i) => (
                // Ids may repeat within a page, so keys are index-qualified.
                <li key={`${String(row.id ?? '')}:${group.start + i}`}>
                  <RowCard row={row} layout={layout} onRowClick={onRowClick} />
                </li>
              ))}
            </ul>
          );
          if (!groupColumn) return <div key="all">{cards}</div>;
          const label = groupLabel(group.value, groupColumn.valueLabels);
          return (
            <section key={`${String(group.value)}:${group.start}`} aria-label={label} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 rounded-md bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <span className="min-w-0 truncate">{label}</span>
                {total !== undefined && totalColumn && (
                  <span className="shrink-0 tabular-nums">{formatCell(total, totalColumn)}</span>
                )}
              </div>
              {cards}
            </section>
          );
        })
      )}

      {(multiPage || !hideRowCount) && (
        <TablePagination page={page} loading={loading} onPageChange={onPageChange} showCount={!hideRowCount} />
      )}
    </div>
  );
}

function RowCard({
  row,
  layout,
  onRowClick,
}: {
  row: TableRow;
  layout: ReturnType<typeof cardLayout>;
  onRowClick?: (row: TableRow) => void;
}) {
  const meta = cardMetaLine(row, layout.meta);
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words text-sm text-slate-900 dark:text-white">
          {layout.title ? formatCell(row[layout.title.key], layout.title) : '—'}
        </span>
        {layout.value && (
          <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
            {formatCell(row[layout.value.key], layout.value)}
          </span>
        )}
      </span>
      {meta && <span className="mt-0.5 block text-xs text-slate-500">{meta}</span>}
    </>
  );
  const shell = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left dark:border-slate-800';
  if (!onRowClick) return <div className={shell}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      className={cn(
        shell,
        'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-800/60',
      )}
    >
      {body}
    </button>
  );
}

/** "Sort [column ▾] [↑]": the column select (incl. "Default order") and, while sorted, the direction toggle. */
function CardSortBar({
  data,
  sort,
  onSortChange,
}: {
  data: TableData;
  sort: SortClause | null;
  onSortChange: (sort: SortClause | null) => void;
}) {
  const pick = (key: string) =>
    onSortChange(key === DEFAULT_ORDER ? null : { key, direction: sort?.direction ?? 'asc' });
  const Icon = sort?.direction === 'desc' ? ArrowDown : ArrowUp;
  return (
    <div className="flex items-center gap-2">
      <Select value={sort?.key ?? DEFAULT_ORDER} onValueChange={pick}>
        <SelectTrigger aria-label="Sort" className="h-8 w-auto min-w-[9rem] gap-2 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_ORDER} className="text-xs">
            Default order
          </SelectItem>
          {data.columns.map((c) => (
            <SelectItem key={c.key} value={c.key} className="text-xs">
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {sort && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={sort.direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
          title="Reverse the order"
          onClick={() => onSortChange({ key: sort.key, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
        >
          <Icon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
