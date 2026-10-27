'use client';

import type { RowData } from '@tanstack/react-table';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { Skeleton } from '../Skeleton/Skeleton';
import { DataTableHeader } from './DataTableHeader';
import { DataTableRow } from './DataTableRow';
import {
  type DataTableProps,
  type DataTableRowProps,
} from './types';
import { useDataTableState } from './useDataTableState';


function DataTableInner<Row extends RowData>(
  props: DataTableProps<Row>,
  ref: React.Ref<HTMLDivElement>,
) {
  const {
    columns: _columns,
    data: _data,
    getRowId: _getRowId,
    sort: _sort,
    defaultSort: _defaultSort,
    onSortChange: _onSortChange,
    sortMode: _sortMode,
    selectable = false,
    selectionAlwaysOn = false,
    selection: _selection,
    defaultSelection: _defaultSelection,
    onSelectionChange: _onSelectionChange,
    allSelected = false,
    onAllSelectedChange: _onAllSelectedChange,
    onRowSelect,
    renderExpanded,
    getRowCanExpand,
    expanded: _expanded,
    defaultExpanded: _defaultExpanded,
    onExpandedChange: _onExpandedChange,
    leading,
    phoneSub,
    phoneActions,
    band,
    dayHeader,
    rowState,
    highlightedRowId,
    wrapRow,
    renderRow,
    pager,
    footer,
    loading = false,
    busy = false,
    empty,
    skeletonRows,
    stickyHeader = true,
    firstRowBorder = true,
    hideHeader = false,
    size = 'md',
    className,
    style,
    ...restProps
  } = props;

  const {
    table,
    pageRows,
    processedColumns,
    gridTemplate,
    selection,
    handleRowSelectionToggle,
    handleHeaderCheckboxChange,
  } = useDataTableState(props);

  // A rendered row scrolls into view once each time it becomes highlighted, like DataTableRow,
  // not on every render while it stays highlighted.
  const scrolledIdRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (highlightedRowId === undefined) scrolledIdRef.current = undefined;
  }, [highlightedRowId]);

  return (
    <div
      ref={ref}
      role="table"
      aria-busy={busy || undefined}
      style={
        {
          '--grid-template': gridTemplate,
          ...style,
        } as React.CSSProperties
      }
      className={cn('relative w-full font-text', className)}
      {...restProps}
    >
      {pager && <div>{pager}</div>}

      {!hideHeader && (
        <DataTableHeader
          table={table}
          allSelected={allSelected}
          onHeaderCheckboxChange={handleHeaderCheckboxChange}
          stickyHeader={stickyHeader}
          closed={!firstRowBorder}
        />
      )}

      {loading ? (
        Array.from({ length: skeletonRows ?? 5 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className={cn(
              (i > 0 || firstRowBorder) && 'border-t border-line-soft',
              'border-l-4 border-l-transparent bg-surface px-space-14 py-space-10 flex flex-col gap-space-8 desk:grid desk:grid-cols-template desk:gap-x-0 desk:px-0 desk:py-0 desk:min-h-space-40 desk:items-center',
            )}
          >
            <div className="flex flex-col gap-space-8 desk:hidden">
              <Skeleton className="w-1/2 h-space-12" />
              <Skeleton className="w-3/4 h-space-10" />
            </div>
            {processedColumns.map((col, idx) => (
              <div
                key={`skel-col-${col.id || idx}`}
                className="hidden desk:block desk:px-space-12 desk:py-space-6 min-w-0"
              >
                <Skeleton className="w-full h-space-12" />
              </div>
            ))}
          </div>
        ))
      ) : pageRows.length === 0 && empty ? (
        <div className={cn(firstRowBorder && 'border-t border-line-soft', 'bg-surface')}>{empty}</div>
      ) : (
        pageRows.map((row, i) => {
          const prevRow = i > 0 ? pageRows[i - 1] : null;
          const currentBand = band ? band(row.original) : null;
          const prevBand = prevRow && band ? band(prevRow.original) : null;
          const showBand =
            currentBand && (!prevBand || currentBand.key !== prevBand.key);

          const currentDay = dayHeader ? dayHeader(row.original) : null;
          const prevDay = prevRow && dayHeader ? dayHeader(prevRow.original) : null;
          const showDay =
            currentDay && (!prevDay || currentDay.key !== prevDay.key);

          const isSelected = Boolean(allSelected || row.getIsSelected());
          const isSelectionMode = Boolean(
            allSelected ||
              (selectable && selectionAlwaysOn) ||
              (selection && selection.length > 0),
          );
          const isHighlighted = highlightedRowId === row.id;
          const isExpanded = row.getIsExpanded();

          let rowNode: React.ReactNode;
          if (renderRow) {
            const rowProps: DataTableRowProps = {
              selectable,
              selected: isSelected,
              onSelectedChange: (next: boolean) =>
                handleRowSelectionToggle(row.id, next),
              selectionMode: isSelectionMode,
              onSelect: (point) => onRowSelect?.(row.original, point),
              highlighted: isHighlighted,
              expanded: isExpanded,
              onExpandedChange: (next: boolean) => row.toggleExpanded(next),
            };
            const rendered = renderRow(row.original, rowProps);
            const wrapped = wrapRow ? wrapRow(row.original, rendered) : rendered;
            rowNode = (
              <div
                key={row.id}
                ref={(el) => {
                  if (isHighlighted && el && scrolledIdRef.current !== row.id) {
                    scrolledIdRef.current = row.id;
                    el.scrollIntoView?.({ block: 'center' });
                  }
                }}
                className={cn(
                  (i > 0 || firstRowBorder) && 'border-t border-line-soft',
                  busy && 'opacity-60',
                )}
              >
                {wrapped}
              </div>
            );
          } else {
            const rowElement = (
              <DataTableRow
                key={row.id}
                row={row}
                table={table}
                selectable={selectable}
                isSelected={isSelected}
                isSelectionMode={isSelectionMode}
                onRowSelectionToggle={handleRowSelectionToggle}
                onRowSelect={onRowSelect}
                renderExpanded={renderExpanded}
                getRowCanExpand={getRowCanExpand}
                leading={leading}
                phoneSub={phoneSub}
                phoneActions={phoneActions}
                rowState={rowState ? rowState(row.original) : undefined}
                highlighted={isHighlighted}
                busy={busy}
                size={size}
                first={i === 0 && !firstRowBorder}
              />
            );
            rowNode = wrapRow ? wrapRow(row.original, rowElement) : rowElement;
          }

          return (
            <React.Fragment key={row.id}>
              {showBand && (
                <SectionHeader variant="band" action={currentBand.action}>
                  {currentBand.label}
                </SectionHeader>
              )}
              {showDay && (
                <SectionHeader
                  variant="strong"
                  meta={currentDay.sublabel}
                  className="desk:hidden"
                >
                  {currentDay.label}
                </SectionHeader>
              )}
              {rowNode}
              {isExpanded && renderExpanded && (
                <div className="border-t border-line-soft bg-sunken">
                  {renderExpanded(row.original)}
                </div>
              )}
            </React.Fragment>
          );
        })
      )}

      {footer && <div className="border-t border-line-soft">{footer}</div>}

      {pager && <div>{pager}</div>}
    </div>
  );
}

export const DataTable = forwardRef(DataTableInner) as <Row extends RowData>(
  p: DataTableProps<Row> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;

Object.defineProperty(DataTable, 'displayName', { value: 'DataTable' });
