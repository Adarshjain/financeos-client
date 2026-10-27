'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { FilterBar, FilterChip, Select } from '@/components/ds';
import { TYPE_OPTIONS } from '@/features/jobs/jobsModel';

import {
  activityUrl,
  type ActivityUrlState,
  filterChipLabel,
  STATUS_OPTIONS,
} from './activityModel';

// Select values are non-empty; '' (every status or type) travels as this sentinel.
const ALL = '__all__';
const toValue = (v: string) => (v === '' ? ALL : v);
const fromValue = (v: string) => (v === ALL ? '' : v);

/** The Status and Type dropdown chips. */
export function ActivityFilters({
  statusFilter,
  typeFilter,
  size,
}: ActivityUrlState) {
  const router = useRouter();

  const go = (overrides: { newStatus?: string; newType?: string }) =>
    router.push(activityUrl({ statusFilter, typeFilter, size }, overrides), {
      scroll: false,
    });

  const statusOptions = STATUS_OPTIONS.map((o) => ({
    value: toValue(o.value),
    label: o.label,
  }));
  const typeOptions = TYPE_OPTIONS.map((o) => ({
    value: toValue(o.value),
    label: o.label,
  }));

  return (
    <FilterBar>
        <Select
          value={toValue(statusFilter)}
          options={statusOptions}
          onValueChange={(v) => go({ newStatus: fromValue(v as string) })}
          trigger={
            <FilterChip className="shrink-0" hasDropdown selected={statusFilter !== ''}>
              {filterChipLabel('Status', STATUS_OPTIONS, statusFilter)}
            </FilterChip>
          }
        />
        <Select
          value={toValue(typeFilter)}
          options={typeOptions}
          onValueChange={(v) => go({ newType: fromValue(v as string) })}
          trigger={
            <FilterChip className="shrink-0" hasDropdown selected={typeFilter !== ''}>
              {filterChipLabel('Type', TYPE_OPTIONS, typeFilter)}
            </FilterChip>
          }
        />
    </FilterBar>
  );
}
