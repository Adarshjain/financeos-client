'use client';

import React from 'react';

import { Button, FilterBar, FilterChip, Icon, Select } from '@/components/ds';

import {
  OBLIGATION_KINDS,
  OBLIGATION_MONTH_OPTIONS,
  type ObligationKindFilter,
} from './obligationsModel';
import { monthsLabel } from './upcomingModel';

export interface UpcomingFiltersProps {
  kind: ObligationKindFilter;
  months: number;
  onKindChange: (kind: ObligationKindFilter) => void;
  onMonthsChange: (months: number) => void;
}

/** Kind chips and the range Select in one FilterBar row (it scrolls sideways when it overflows). */
export function UpcomingFilters({ kind, months, onKindChange, onMonthsChange }: UpcomingFiltersProps) {
  return (
    <FilterBar>
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
      <Select
        value={String(months)}
        options={OBLIGATION_MONTH_OPTIONS.map((m) => ({
          value: String(m),
          label: monthsLabel(m),
        }))}
        onValueChange={(v) => onMonthsChange(Number(v))}
        trigger={
          <Button variant="secondary" size="sm" aria-label="Range" className="shrink-0">
            {monthsLabel(months)}
            <Icon name="chevron-down" size="xs" />
          </Button>
        }
      />
    </FilterBar>
  );
}
