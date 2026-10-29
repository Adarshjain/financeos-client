'use client';

import {
  type ColumnDef,
  createColumnHelper,
  type ExpandedState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
  useTable,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

import { useControllableState } from '../useControllableState';
import {
  type DataTableColumnMeta,
  type DataTableFeatures,
  dataTableFeatures,
  type DataTableProps,
} from './types';

const EMPTY_DATA: never[] = [];
const EMPTY_SELECTION: string[] = [];
const EMPTY_EXPANDED: string[] = [];

const colHelper = createColumnHelper<
  typeof dataTableFeatures,
  Record<string, unknown>
>();
const selectDisplayColumn = colHelper.display({
  id: '__select',
  meta: { size: 'xs' },
});
const expandDisplayColumn = colHelper.display({
  id: '__expand',
  meta: { size: 'xs' },
});

function getColumnTrack(meta?: DataTableColumnMeta): string {
  const size = meta?.size;
  switch (size) {
    case 'xs':
      return 'var(--ds-control-md)';
    case 'sm':
      return 'var(--ds-space-96)';
    case 'date':
      return 'calc(var(--ds-space-96) * 1.25)';
    case 'md':
      return 'calc(var(--ds-space-96) * 1.5)';
    case 'lg':
      return 'calc(var(--ds-space-96) * 2)';
    case 'fill':
    default: {
      const grow = meta?.grow ?? 1;
      return `minmax(0, ${grow}fr)`;
    }
  }
}

export function useDataTableState<Row extends RowData>(props: DataTableProps<Row>) {
  const {
    columns,
    data: dataProp,
    getRowId,
    sort: sortProp,
    defaultSort,
    onSortChange,
    sortMode = 'server',
    selectable = false,
    selection: selectionProp,
    defaultSelection,
    onSelectionChange,
    allSelected = false,
    onAllSelectedChange,
    renderExpanded,
    getRowCanExpand,
    expanded: expandedProp,
    defaultExpanded,
    onExpandedChange,
    pager,
  } = props;

  if (process.env.NODE_ENV !== 'production') {
    if (sortMode === 'client' && pager) {
      console.warn(
        'DataTable: sortMode="client" should not be combined with a pager.',
      );
    }
    const seenSlots = new Set<string>();
    for (const col of columns) {
      const slot = col.meta?.phone;
      if (slot === 'main' || slot === 'amount' || slot === 'status') {
        if (seenSlots.has(slot)) {
          console.warn(
            `DataTable: More than one column claimed the phone slot "${slot}".`,
          );
        }
        seenSlots.add(slot);
      }
    }
  }

  const data = dataProp ?? EMPTY_DATA;

  const [sort, setSort] = useControllableState<{
    id: string;
    desc: boolean;
  } | null>({
    value: sortProp,
    defaultValue: defaultSort ?? null,
    onChange: onSortChange,
  });

  const sortingState = useMemo<SortingState>(() => {
    return sort ? [{ id: sort.id, desc: sort.desc }] : [];
  }, [sort]);

  const handleSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const current = sort ? [{ id: sort.id, desc: sort.desc }] : [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      const nextSort =
        next.length > 0 ? { id: next[0].id, desc: next[0].desc } : null;
      setSort(nextSort);
    },
    [sort, setSort],
  );

  const [selection, setSelection] = useControllableState<string[]>({
    value: selectionProp,
    defaultValue: defaultSelection ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
  });

  const rowSelectionState = useMemo<RowSelectionState>(() => {
    return Object.fromEntries(
      (selection ?? []).map((id) => [id, true as const]),
    ) as Record<string, true>;
  }, [selection]);

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const current = Object.fromEntries(
        (selection ?? []).map((id) => [id, true as const]),
      ) as Record<string, true>;
      const next = typeof updater === 'function' ? updater(current) : updater;
      const nextSelection = Object.keys(next).filter((k) => next[k]);
      setSelection(nextSelection);
    },
    [selection, setSelection],
  );

  const [expanded, setExpanded] = useControllableState<string[]>({
    value: expandedProp,
    defaultValue: defaultExpanded ?? EMPTY_EXPANDED,
    onChange: onExpandedChange,
  });

  const expandedState = useMemo<Record<string, boolean>>(() => {
    return Object.fromEntries((expanded ?? []).map((id) => [id, true]));
  }, [expanded]);

  const handleExpandedChange = useCallback(
    (updater: Updater<ExpandedState>) => {
      const current = Object.fromEntries(
        (expanded ?? []).map((id) => [id, true]),
      );
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (next === true) return;
      const nextExpanded = Object.keys(next).filter((k) => next[k]);
      setExpanded(nextExpanded);
    },
    [expanded, setExpanded],
  );

  const hasExpanded = Boolean(renderExpanded);

  const processedColumns = useMemo(() => {
    const list: ColumnDef<DataTableFeatures, Row, unknown>[] = [];
    if (selectable) {
      list.push(
        selectDisplayColumn as unknown as ColumnDef<
          DataTableFeatures,
          Row,
          unknown
        >,
      );
    }
    if (hasExpanded) {
      list.push(
        expandDisplayColumn as unknown as ColumnDef<
          DataTableFeatures,
          Row,
          unknown
        >,
      );
    }
    for (const col of columns) {
      list.push({
        ...col,
        enableSorting: Boolean(col.meta?.sortable),
      });
    }
    return list;
  }, [selectable, hasExpanded, columns]);

  const gridTemplate = useMemo(() => {
    return processedColumns.map((col) => getColumnTrack(col.meta)).join(' ');
  }, [processedColumns]);

  const table = useTable({
    features: dataTableFeatures,
    columns: processedColumns,
    data,
    getRowId,
    state: {
      sorting: sortingState,
      rowSelection: rowSelectionState,
      expanded: expandedState,
    },
    onSortingChange: handleSortingChange,
    onRowSelectionChange: handleRowSelectionChange,
    onExpandedChange: handleExpandedChange,
    enableMultiSort: false,
    enableSortingRemoval: true,
    sortDescFirst: false,
    manualSorting: sortMode === 'server',
    enableRowSelection: Boolean(selectable),
    enableRowRangeSelection: false,
    getRowCanExpand: (r) =>
      getRowCanExpand
        ? getRowCanExpand(r.original)
        : Boolean(renderExpanded),
  });

  const pageRows = table.getRowModel().rows;
  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);

  const handleRowSelectionToggle = useCallback(
    (rowId: string, next: boolean) => {
      if (allSelected) {
        onAllSelectedChange?.(false);
        setSelection(pageRowIds.filter((id) => id !== rowId));
        return;
      }
      const r = table.getRow(rowId);
      r?.toggleSelected(next);
    },
    [allSelected, onAllSelectedChange, pageRowIds, setSelection, table],
  );

  const handleHeaderCheckboxChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (allSelected) {
        onAllSelectedChange?.(false);
        setSelection([]);
        return;
      }
      table.toggleAllPageRowsSelected(checked === true);
    },
    [allSelected, onAllSelectedChange, setSelection, table],
  );

  return {
    table,
    pageRows,
    processedColumns,
    gridTemplate,
    selection,
    setSelection,
    handleRowSelectionToggle,
    handleHeaderCheckboxChange,
  };
}
