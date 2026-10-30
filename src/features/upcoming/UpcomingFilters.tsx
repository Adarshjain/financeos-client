'use client';

import React from 'react';

import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Select } from '@/components/ds/Select/Select';

import {
  DEFAULT_OBLIGATION_MONTHS,
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
  /** Puts the kind and the range back to their defaults together. */
  onReset: () => void;
}

/** Two dropdown chips, kind and range, in one FilterBar row; a chip off its default shows just its value and a ×. */
export function UpcomingFilters({ kind, months, onKindChange, onMonthsChange, onReset }: UpcomingFiltersProps) {
  const kindChanged = kind !== 'all';
  const monthsChanged = months !== DEFAULT_OBLIGATION_MONTHS;
  return (
    <FilterBar changed={kindChanged || monthsChanged} onReset={onReset}>
      <Select
        value={kind}
        options={OBLIGATION_KINDS}
        onValueChange={(v) => onKindChange(v as ObligationKindFilter)}
        trigger={
          <FilterChip
            className="shrink-0"
            hasDropdown
            changed={kindChanged}
            onReset={() => onKindChange('all')}
          >
            {kindChanged ? (OBLIGATION_KINDS.find((k) => k.value === kind)?.label ?? 'Type') : 'Type'}
          </FilterChip>
        }
      />
      <Select
        value={String(months)}
        options={OBLIGATION_MONTH_OPTIONS.map((m) => ({
          value: String(m),
          label: monthsLabel(m),
        }))}
        onValueChange={(v) => onMonthsChange(Number(v))}
        trigger={
          <FilterChip
            className="shrink-0"
            hasDropdown
            changed={monthsChanged}
            onReset={() => onMonthsChange(DEFAULT_OBLIGATION_MONTHS)}
          >
            {monthsLabel(months)}
          </FilterChip>
        }
      />
    </FilterBar>
  );
}
