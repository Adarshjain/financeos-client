'use client';

import React from 'react';

import { Button, FilterChip, Icon, Select } from '@/components/ds';

import {
  OBLIGATION_KINDS,
  OBLIGATION_MONTH_OPTIONS,
  type ObligationKindFilter,
} from './obligations';
import { monthsLabel } from './upcomingModel';

export interface UpcomingFiltersProps {
  kind: ObligationKindFilter;
  months: number;
  onKindChange: (kind: ObligationKindFilter) => void;
  onMonthsChange: (months: number) => void;
}

/** Kind chips (scroll sideways on phone, never wrap) and, at the row's right end, the range Select. */
export function UpcomingFilters({ kind, months, onKindChange, onMonthsChange }: UpcomingFiltersProps) {
  return (
    <div className="flex items-center gap-space-8">
      <div className="flex flex-1 min-w-0 gap-space-8 overflow-x-auto">
        {OBLIGATION_KINDS.map((k) => (
          <FilterChip
            key={k.value}
            className="shrink-0"
            selected={kind === k.value}
            onClick={() => onKindChange(k.value)}
          >
            {k.label}
          </FilterChip>
        ))}
      </div>
      <div className="shrink-0">
        <Select
          value={String(months)}
          options={OBLIGATION_MONTH_OPTIONS.map((m) => ({
            value: String(m),
            label: monthsLabel(m),
          }))}
          onValueChange={(v) => onMonthsChange(Number(v))}
          trigger={
            <Button variant="secondary" size="sm" aria-label="Range">
              {monthsLabel(months)}
              <Icon name="chevron-down" size="xs" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
