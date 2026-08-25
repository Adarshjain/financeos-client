'use client';

import React from 'react';

export interface ChatTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: 'inr' | 'number' | 'text';
}

export interface ChatTableBlock {
  title?: string;
  columns: ChatTableColumn[];
  rows: Record<string, string | number | boolean | null>[];
}

interface ChatDataTableProps {
  table: ChatTableBlock;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

function formatCellValue(
  value: string | number | boolean | null | undefined,
  format?: 'inr' | 'number' | 'text',
): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'number') {
    if (format === 'inr') {
      return inrFormatter.format(value);
    }
    if (format === 'number') {
      return numberFormatter.format(value);
    }
    return String(value);
  }
  return String(value);
}

export function ChatDataTable({ table }: ChatDataTableProps) {
  if (!table || !table.columns?.length || !table.rows?.length) {
    return null;
  }

  return (
    <div className="rounded-[10px] bg-[var(--surface)] p-3 shadow-[var(--shadow-hairline)]">
      {table.title ? (
        <h4 className="mb-2 text-2xs font-medium text-[var(--ink-2)]">
          {table.title}
        </h4>
      ) : null}
      <div className="max-h-64 overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse text-2xs">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {table.columns.map((col) => {
                const isRight =
                  col.align === 'right' ||
                  col.format === 'inr' ||
                  col.format === 'number';
                return (
                  <th
                    key={col.key}
                    className={`pb-1.5 font-medium text-[var(--ink-3)] ${
                      isRight ? 'text-right tabular-nums' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-[var(--line)] last:border-b-0"
              >
                {table.columns.map((col) => {
                  const isRight =
                    col.align === 'right' ||
                    col.format === 'inr' ||
                    col.format === 'number';
                  const cellVal = row[col.key];
                  const formatted = formatCellValue(cellVal, col.format);
                  return (
                    <td
                      key={col.key}
                      className={`py-1.5 text-[var(--ink)] align-top ${
                        isRight ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
