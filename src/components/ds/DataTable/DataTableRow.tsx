'use client';

import {
  flexRender,
  type Row as TanStackRow,
  type RowData,
  type Table,
} from '@tanstack/react-table';
import React, { useEffect, useRef } from 'react';
import { mergeProps } from 'react-aria';

import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useSelectableItem } from '../useSelectableItem';
import type { DataTableColumnMeta, DataTableFeatures } from './types';

export interface DataTableRowComponentProps<Row extends RowData> {
  row: TanStackRow<DataTableFeatures, Row>;
  table: Table<DataTableFeatures, Row>;
  selectable?: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onRowSelectionToggle: (rowId: string, next: boolean) => void;
  onRowSelect?: (row: Row) => void;
  renderExpanded?: (row: Row) => React.ReactNode;
  getRowCanExpand?: (row: Row) => boolean;
  phoneSub?: (row: Row) => React.ReactNode;
  phoneActions?: (row: Row) => React.ReactNode;
  rowState?: { tone?: 'warning'; disabled?: boolean; muted?: boolean };
  highlighted?: boolean;
  busy?: boolean;
}

export function DataTableRow<Row extends RowData>({
  row,
  table,
  selectable = false,
  isSelected,
  isSelectionMode,
  onRowSelectionToggle,
  onRowSelect,
  renderExpanded,
  getRowCanExpand,
  phoneSub,
  phoneActions,
  rowState,
  highlighted = false,
  busy = false,
}: DataTableRowComponentProps<Row>) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && rowRef.current) {
      rowRef.current.scrollIntoView?.({ block: 'center' });
    }
  }, [highlighted]);

  const isExpanded = row.getIsExpanded();
  const canExpand = Boolean(
    renderExpanded && (getRowCanExpand ? getRowCanExpand(row.original) : true),
  );
  const showEye = isSelectionMode && Boolean(onRowSelect);
  const hasThirdCol = isSelectionMode || canExpand;
  const isClickable =
    (Boolean(onRowSelect) || canExpand || selectable) && !rowState?.disabled;

  const handleRowPress = () => {
    if (onRowSelect) {
      onRowSelect(row.original);
    } else if (canExpand) {
      row.toggleExpanded();
    }
  };

  const { itemProps, nestedControlProps } = useSelectableItem({
    selectable,
    selected: isSelected,
    onSelectedChange: (next) => onRowSelectionToggle(row.id, next),
    selectionMode: isSelectionMode,
    onPress: handleRowPress,
    disabled: rowState?.disabled,
  });

  const sub = phoneSub?.(row.original);
  const actions = phoneActions?.(row.original);

  const isHighlighted = highlighted;
  const isWarning = rowState?.tone === 'warning';

  return (
    <div
      ref={rowRef}
      role={onRowSelect ? 'button' : 'row'}
      aria-selected={selectable ? isSelected : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'border-t border-line-soft border-l-4 text-body font-text transition-colors',
        selectable && 'select-none touch-callout-none',
        hasThirdCol ? 'grid-cols-fill-auto-auto' : 'grid-cols-fill-auto',
        'grid gap-x-space-10 px-space-14 py-space-10',
        'desk:grid desk:grid-cols-template desk:gap-x-0 desk:px-0 desk:py-0 desk:min-h-space-40 desk:items-center',
        isHighlighted
          ? 'border-l-brand-strong bg-brand-tint'
          : isSelected
            ? 'border-l-brand bg-brand-tint'
            : isWarning
              ? 'border-l-attention bg-attention-tint'
              : 'border-l-transparent bg-surface',
        rowState?.disabled && 'opacity-60 pointer-events-none',
        rowState?.muted && 'opacity-60',
        busy && 'opacity-60',
        isClickable &&
          !isSelected &&
          !isHighlighted &&
          !isWarning &&
          'cursor-pointer hover:bg-hover active-self:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
        isClickable &&
          (isSelected || isHighlighted || isWarning) &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
      )}
      {...mergeProps(itemProps)}
    >
      {row.getVisibleCells().map((cell) => {
        if (cell.column.id === '__select') {
          return (
            <div
              key={cell.id}
              role="cell"
              {...nestedControlProps}
              className="hidden desk:flex items-center justify-center min-w-0"
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onRowSelectionToggle(row.id, checked === true)
                }
                aria-label="Select row"
              />
            </div>
          );
        }

        if (cell.column.id === '__expand') {
          return (
            <div
              key={cell.id}
              role="cell"
              {...nestedControlProps}
              className={cn(
                'items-center justify-center min-w-0',
                canExpand && !showEye
                  ? 'col-start-3 row-start-1 row-span-2 self-center flex desk:col-start-auto desk:row-start-auto desk:col-span-1 desk:row-span-1'
                  : 'hidden desk:flex desk:col-start-auto desk:row-start-auto desk:col-span-1 desk:row-span-1',
              )}
            >
              {canExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                  onClick={() => row.toggleExpanded()}
                  icon={
                    <Icon
                      name={isExpanded ? 'chevron-down' : 'chevron-right'}
                      size="sm"
                    />
                  }
                />
              )}
            </div>
          );
        }

        const meta = cell.column.columnDef.meta as
          | DataTableColumnMeta
          | undefined;
        const isMain = meta?.phone === 'main';
        const isAmount = meta?.phone === 'amount';
        const isStatus = meta?.phone === 'status';

        return (
          <div
            key={cell.id}
            role="cell"
            className={cn(
              'min-w-0 desk:px-space-12 desk:py-space-6 desk:col-start-auto desk:row-start-auto desk:col-span-1 desk:row-span-1',
              meta?.wrap ? 'whitespace-normal break-words' : 'truncate',
              meta?.align === 'end' &&
                'text-end tabular-nums desk:text-end justify-self-end',
              isMain && 'col-start-1 row-start-1 text-body-strong desk:text-body',
              isAmount && 'col-start-2 row-start-1 text-end',
              isStatus &&
                'col-start-2 row-start-2 justify-self-end flex flex-wrap justify-end gap-space-4',
              isStatus &&
                (meta?.align === 'end'
                  ? 'desk:justify-self-end desk:justify-end'
                  : 'desk:justify-self-start desk:justify-start'),
              !isMain && !isAmount && !isStatus && 'hidden desk:block',
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        );
      })}

      {showEye && (
        <div
          {...nestedControlProps}
          className="desk:hidden col-start-3 row-start-1 row-span-2 self-center flex items-center justify-center"
        >
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Open"
            onClick={() => onRowSelect?.(row.original)}
            icon={<Icon name="view" size="md" />}
          />
        </div>
      )}

      {sub && (
        <div className="desk:hidden col-start-1 row-start-2 text-caption text-ink-3">
          {sub}
        </div>
      )}

      {actions && (
        <div className="desk:hidden col-span-full row-start-3 flex justify-end gap-space-8 pt-space-8">
          {actions}
        </div>
      )}
    </div>
  );
}
