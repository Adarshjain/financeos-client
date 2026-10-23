import {
  type ColumnDef,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  metaHelper,
  type RowData,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';
import type React from 'react';

export interface DataTableColumnMeta {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fill';
  grow?: number;
  align?: 'start' | 'end';
  wrap?: boolean;
  phone?: 'main' | 'amount' | 'status' | 'hidden';
  sortable?: boolean;
}

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;

export function createDataTableColumnHelper<Row extends RowData>() {
  return createColumnHelper<typeof dataTableFeatures, Row>();
}

export interface DataTableRowProps {
  selectable?: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  selectionMode: boolean;
  onSelect: () => void;
  highlighted: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export interface DataTableProps<Row extends RowData>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  columns: ColumnDef<DataTableFeatures, Row, unknown>[];
  data: Row[];
  getRowId: (row: Row) => string;

  sort?: { id: string; desc: boolean } | null;
  defaultSort?: { id: string; desc: boolean } | null;
  onSortChange?: (sort: { id: string; desc: boolean } | null) => void;
  sortMode?: 'server' | 'client';

  selectable?: boolean;
  selection?: string[];
  defaultSelection?: string[];
  onSelectionChange?: (selection: string[]) => void;

  allSelected?: boolean;
  onAllSelectedChange?: (allSelected: boolean) => void;

  onRowSelect?: (row: Row) => void;

  renderExpanded?: (row: Row) => React.ReactNode;
  getRowCanExpand?: (row: Row) => boolean;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;

  leading?: (row: Row) => React.ReactNode;
  phoneSub?: (row: Row) => React.ReactNode;
  phoneActions?: (row: Row) => React.ReactNode;

  band?: (
    row: Row,
  ) => { key: string; label: React.ReactNode; action?: React.ReactNode } | null;
  dayHeader?: (
    row: Row,
  ) => { key: string; label: React.ReactNode; sublabel?: React.ReactNode } | null;

  rowState?: (row: Row) => { tone?: 'warning'; disabled?: boolean; muted?: boolean; pressable?: boolean } | undefined;
  highlightedRowId?: string;

  wrapRow?: (row: Row, node: React.ReactNode) => React.ReactNode;
  renderRow?: (row: Row, rowProps: DataTableRowProps) => React.ReactNode;

  pager?: React.ReactNode;
  footer?: React.ReactNode;

  loading?: boolean;
  busy?: boolean;
  empty?: React.ReactNode;
  skeletonRows?: number;

  stickyHeader?: boolean;
  /** No header row on desktop, for a single-column list where it would only repeat the column's name. */
  hideHeader?: boolean;
}
