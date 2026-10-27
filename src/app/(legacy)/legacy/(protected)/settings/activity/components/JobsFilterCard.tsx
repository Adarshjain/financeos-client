import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';

interface JobsFilterCardProps {
  statusOptions: { label: string; value: string }[];
  typeOptions: { label: string; value: string }[];
  statusFilter: string;
  typeFilter: string;
  createFilterUrl: (
    newStatus?: string,
    newType?: string,
    newPage?: number
  ) => string;
}

export function JobsFilterCard({
  statusOptions,
  typeOptions,
  statusFilter,
  typeFilter,
  createFilterUrl,
}: JobsFilterCardProps) {
  return (
    <div className="hidden sm:block space-y-3 bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-medium text-slate-500 mr-1">
          Status:
        </span>
        {statusOptions.map((opt) => {
          const isActive = statusFilter === opt.value;
          return (
            <Button
              key={opt.value}
              asChild
              variant={isActive ? 'filter-active' : 'filter'}
              size="xs"
            >
              <Link href={createFilterUrl(opt.value, undefined, 0)}>
                {opt.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
        <span className="text-2xs font-medium text-slate-500 mr-1">
          Job Type:
        </span>
        {typeOptions.map((opt) => {
          const isActive = typeFilter === opt.value;
          return (
            <Button
              key={opt.value}
              asChild
              variant={isActive ? 'filter-active' : 'filter'}
              size="xs"
            >
              <Link href={createFilterUrl(undefined, opt.value, 0)}>
                {opt.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
