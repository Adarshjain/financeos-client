'use client';

// A raw table on desktop, the same rows as cards on phones (below `sm`).
// The parent fetches once and hands the page here; only the rendering
// switches, so crossing the breakpoint never refetches.

import { BELOW_SM_QUERY, useMediaQuery } from '@/lib/useMediaQuery';

import { TableCardList } from './TableCardList';
import { TableView } from './TableView';

type TableViewProps = Parameters<typeof TableView>[0];

export interface ResponsiveTableViewProps
  extends Pick<
    TableViewProps,
    | 'data'
    | 'onPageChange'
    | 'loading'
    | 'sort'
    | 'onSortChange'
    | 'onRowClick'
    | 'groupField'
    | 'groupTotals'
    | 'hideRowCount'
  > {
  /**
   * The rows' figure: on cards the bold value, on the table the column a group total sits in.
   * Default: the last currency column, else the last number column.
   */
  valueKey?: string | null;
}

export function ResponsiveTableView({ valueKey, ...props }: ResponsiveTableViewProps) {
  const phone = useMediaQuery(BELOW_SM_QUERY);
  if (phone) return <TableCardList {...props} valueKey={valueKey} />;
  return <TableView {...props} hideGroupColumn groupTotalKey={valueKey} />;
}
