'use client';

// A grouped underlying listing as one table per group (net worth: Assets, then
// Liabilities), each under a heading that carries the group's total over every
// listed row, with the group column itself left out. The tables share the
// dialog's one runtime sort (any table's header drives it; the server sorts the
// page and each table keeps its rows' order) and one pager under the last
// table. On phones the tables are card lists under one Sort bar.

import { CardSortBar,TableCardList } from '@/components/reports/views/TableCardList';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { TableView } from '@/components/reports/views/TableView';
import { groupLabel, groupTotal, partitionByGroup } from '@/features/reports/underlying/underlying.helpers';
import { formatCell } from '@/features/reports/view/cells';
import type { SortClause, TableData, TableRow } from '@/lib/reports.types';
import { BELOW_SM_QUERY, useMediaQuery } from '@/lib/useMediaQuery';

export interface UnderlyingGroupTablesProps {
  /** The page of rows, all groups together. */
  table: TableData;
  groupField: string;
  /** Each group's total over all pages, keyed by the stored group value. */
  groupTotals: Record<string, number> | null | undefined;
  /** The measure column: the totals print in its format, and it is the cards' figure. */
  valueKey: string;
  /** A column folded into the name column, if the datasource has one. */
  subtitleKey?: string | null;
  sort: SortClause | null;
  onSortChange: (sort: SortClause | null) => void;
  onPageChange: (page: number) => void;
  /** Disables the pager while a page is in flight. */
  loading?: boolean;
  onRowClick?: (row: TableRow) => void;
}

export function UnderlyingGroupTables({
  table,
  groupField,
  groupTotals,
  valueKey,
  subtitleKey,
  sort,
  onSortChange,
  onPageChange,
  loading,
  onRowClick,
}: UnderlyingGroupTablesProps) {
  const phone = useMediaQuery(BELOW_SM_QUERY);
  const groupColumn = table.columns.find((c) => c.key === groupField);
  const valueColumn = table.columns.find((c) => c.key === valueKey);
  // The group is the table: its column goes.
  const columns = table.columns.filter((c) => c.key !== groupField);
  const groups = partitionByGroup(table.rows, groupField, groupTotals);
  const { page } = table;
  const multiPage = page.totalElements > page.size || page.number > 0;

  return (
    <div className="space-y-5">
      {phone && (
        <CardSortBar
          columns={columns.filter((c) => c.key !== subtitleKey)}
          sort={sort}
          onSortChange={onSortChange}
        />
      )}
      {groups.map((group) => {
        const label = groupLabel(group.value, groupColumn?.valueLabels);
        const total = groupTotal(groupTotals, group.value);
        const data: TableData = { ...table, columns, rows: group.rows };
        return (
          <section key={String(group.value ?? '')} aria-label={label} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{label}</h3>
              {total !== undefined && valueColumn && (
                <span className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                  {formatCell(total, valueColumn)}
                </span>
              )}
            </div>
            {phone ? (
              <TableCardList
                data={data}
                onRowClick={onRowClick}
                valueKey={valueKey}
                subtitleKey={subtitleKey}
                hideRowCount
                hidePagination
              />
            ) : (
              <TableView
                data={data}
                sort={sort}
                onSortChange={onSortChange}
                onRowClick={onRowClick}
                subtitleKey={subtitleKey}
                hideRowCount
                hidePagination
              />
            )}
          </section>
        );
      })}
      {multiPage && <TablePagination page={page} loading={loading} onPageChange={onPageChange} showCount={false} />}
    </div>
  );
}
