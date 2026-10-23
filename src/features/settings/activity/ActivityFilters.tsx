'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { FilterChip, Select } from '@/components/ds';
import { TYPE_OPTIONS } from '@/features/jobs/jobsModel';
import { useJobsCount } from '@/features/jobs/useJobsHistory';

import {
  activityUrl,
  type ActivityUrlState,
  COUNTED_STATUSES,
  filterChipLabel,
  STATUS_OPTIONS,
} from './activityModel';

// Select values are non-empty; '' (every status or type) travels as this sentinel.
const ALL = '__all__';
const toValue = (v: string) => (v === '' ? ALL : v);
const fromValue = (v: string) => (v === ALL ? '' : v);

/** The Status and Type dropdown chips. Running and Failed carry their counts, for the chosen type. */
export function ActivityFilters({
  statusFilter,
  typeFilter,
  size,
}: ActivityUrlState) {
  const router = useRouter();
  const running = useJobsCount('active', typeFilter);
  const failed = useJobsCount('FAILED', typeFilter);
  const counts: Record<string, number | undefined> = {
    active: running,
    FAILED: failed,
  };

  const go = (overrides: { newStatus?: string; newType?: string }) =>
    router.push(activityUrl({ statusFilter, typeFilter, size }, overrides), {
      scroll: false,
    });

  const statusOptions = STATUS_OPTIONS.map((o) => ({
    value: toValue(o.value),
    label: o.label,
    // A string, so a count of 0 still shows.
    hint:
      COUNTED_STATUSES.includes(o.value) && counts[o.value] !== undefined
        ? String(counts[o.value])
        : undefined,
  }));
  const typeOptions = TYPE_OPTIONS.map((o) => ({
    value: toValue(o.value),
    label: o.label,
  }));

  return (
    <div className="flex gap-space-8 overflow-x-auto">
      <div className="shrink-0">
        <Select
          value={toValue(statusFilter)}
          options={statusOptions}
          onValueChange={(v) => go({ newStatus: fromValue(v as string) })}
          trigger={
            <FilterChip hasDropdown selected={statusFilter !== ''}>
              {filterChipLabel(
                'Status',
                STATUS_OPTIONS,
                statusFilter,
                counts[statusFilter]
              )}
            </FilterChip>
          }
        />
      </div>
      <div className="shrink-0">
        <Select
          value={toValue(typeFilter)}
          options={typeOptions}
          onValueChange={(v) => go({ newType: fromValue(v as string) })}
          trigger={
            <FilterChip hasDropdown selected={typeFilter !== ''}>
              {filterChipLabel('Type', TYPE_OPTIONS, typeFilter)}
            </FilterChip>
          }
        />
      </div>
    </div>
  );
}
