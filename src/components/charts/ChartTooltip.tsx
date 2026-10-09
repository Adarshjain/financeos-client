'use client';

// Tooltip card shared by every Recharts chart. Pass it as an element —
// `<Tooltip content={<ChartTooltipContent format={...} />} />` — and Recharts
// injects `active` / `payload` / `label`. Values lead (strong ink), series
// names follow (muted), each keyed by a short stroke of the series colour.

import type { ReactNode } from 'react';

interface TooltipItem {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: string | number;
  format: (value: number) => string;
  /** Explicit colour per series name; falls back to what Recharts reports. */
  colors?: Record<string, string>;
  /** Heading override; defaults to the hovered category. */
  title?: (
    label: string | number | undefined,
    payload: ReadonlyArray<TooltipItem>
  ) => ReactNode;
  /** Adds a "Total" row (stacked bars). */
  showTotal?: boolean;
  /** Extra muted line under the rows, e.g. a price's source. */
  footer?: (payload: ReadonlyArray<TooltipItem>) => ReactNode;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  format,
  colors,
  title,
  showTotal,
  footer,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => typeof p.value === 'number');
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, p) => sum + (p.value as number), 0);
  const heading = title ? title(label, payload) : label;

  return (
    <div className="min-w-[9rem] rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {heading !== undefined && heading !== '' && (
        <div className="mb-1.5 font-medium text-popover-foreground">
          {heading}
        </div>
      )}
      <div className="space-y-1">
        {rows.map((p) => {
          const name = String(p.name ?? p.dataKey ?? '');
          return (
            <div key={name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ background: colors?.[name] ?? p.color }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {name}
              </span>
              <span className="font-semibold tabular-nums text-popover-foreground">
                {format(p.value as number)}
              </span>
            </div>
          );
        })}
        {showTotal && rows.length > 1 && (
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums text-popover-foreground">
              {format(total)}
            </span>
          </div>
        )}
      </div>
      {footer && (
        <div className="mt-1 text-2xs text-muted-foreground">
          {footer(payload)}
        </div>
      )}
    </div>
  );
}
