'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { JobErrorDetails } from '@/components/jobs/JobErrorDetails';
import { JobRowActions } from '@/components/jobs/JobRowActions';
import { buildJobsFilterUrl } from '@/components/jobs/jobUtils';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export { JobErrorDetails, JobRowActions };

interface FilterOption {
  label: string;
  value: string;
}

interface JobsPageActionBarProps {
  statusOptions: FilterOption[];
  typeOptions: FilterOption[];
  statusFilter: string;
  typeFilter: string;
  size: number;
}

export function JobsPageActionBar({
  statusOptions,
  typeOptions,
  statusFilter,
  typeFilter,
  size,
}: JobsPageActionBarProps) {
  const router = useRouter();
  // Functions can't cross the server→client prop boundary, so build URLs here
  // from primitives via the shared helper.
  const createFilterUrl = (newStatus?: string, newType?: string, newPage = 0) =>
    buildJobsFilterUrl({ statusFilter, typeFilter, size }, { newStatus, newType, newPage });
  // Radix Select forbids empty-string item values, so map '' ↔ a sentinel.
  const ALL = '__all__';
  const toValue = (v: string) => (v === '' ? ALL : v);
  const fromValue = (v: string) => (v === ALL ? '' : v);

  return (
    <PageActionBar>
      <div className="flex items-center gap-2 w-full text-2xs">
        <Select
          value={toValue(statusFilter)}
          onValueChange={(v) => router.push(createFilterUrl(fromValue(v), undefined, 0))}
        >
          <SelectTrigger className="h-8 flex-1 min-w-0 text-2xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={toValue(opt.value)} className="text-2xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={toValue(typeFilter)}
          onValueChange={(v) => router.push(createFilterUrl(undefined, fromValue(v), 0))}
        >
          <SelectTrigger className="h-8 flex-1 min-w-0 text-2xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={toValue(opt.value)} className="text-2xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </PageActionBar>
  );
}
