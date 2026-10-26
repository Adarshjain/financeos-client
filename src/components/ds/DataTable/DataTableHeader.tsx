'use client';

import { flexRender, type RowData, type Table } from '@tanstack/react-table';
import React from 'react';

import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import type { DataTableColumnMeta, DataTableFeatures } from './types';

export interface DataTableHeaderProps<Row extends RowData> {
  table: Table<DataTableFeatures, Row>;
  allSelected?: boolean;
  onHeaderCheckboxChange: (checked: boolean | 'indeterminate') => void;
  stickyHeader?: boolean;
}

export function DataTableHeader<Row extends RowData>({
  table,
  allSelected = false,
  onHeaderCheckboxChange,
  stickyHeader = true,
}: DataTableHeaderProps<Row>) {
  return (
    <>
      {table.getHeaderGroups().map((headerGroup) => (
        <div
          key={headerGroup.id}
          role="row"
          className={cn(
            'hidden desk:grid desk:grid-cols-template h-control-md items-center bg-sunken border-l-4 border-l-transparent',
            stickyHeader && 'desk:sticky desk:top-[var(--ds-sticky-top,0px)] desk:z-sticky',
          )}
        >
          {headerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta as
              | DataTableColumnMeta
              | undefined;
            const isSelectCol = header.column.id === '__select';
            const isExpandCol = header.column.id === '__expand';

            if (isSelectCol) {
              const all = allSelected || table.getIsAllPageRowsSelected();
              const some =
                table.getIsSomePageRowsSelected() &&
                !table.getIsAllPageRowsSelected();
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  className="flex items-center justify-center min-w-0"
                >
                  <Checkbox
                    checked={all ? true : some ? 'indeterminate' : false}
                    onCheckedChange={onHeaderCheckboxChange}
                    aria-label="Select all rows"
                  />
                </div>
              );
            }

            if (isExpandCol) {
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  className="flex items-center justify-center min-w-0"
                />
              );
            }

            const canSort = header.column.getCanSort();
            const isSorted = header.column.getIsSorted();

            return (
              <div
                key={header.id}
                role="columnheader"
                className={cn(
                  'px-space-12 text-overline uppercase text-ink-3 min-w-0 truncate',
                  meta?.align === 'end' && 'justify-self-end text-end',
                )}
              >
                {canSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={header.column.getToggleSortingHandler()}
                    className="-ml-space-8 gap-space-4 text-overline uppercase text-ink-3 font-extrabold hover:text-ink h-control-sm"
                  >
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </span>
                    {isSorted === 'asc' && (
                      <Icon name="chevron-up" size="sm" />
                    )}
                    {isSorted === 'desc' && (
                      <Icon name="chevron-down" size="sm" />
                    )}
                  </Button>
                ) : (
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
