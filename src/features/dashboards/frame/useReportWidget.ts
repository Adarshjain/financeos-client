'use client';

// One widget's data with the runtime controls of a table: page, page size and header sort (session-only, back to
// the first page when size or sort change). Built on `useWidgetData`; `enabled` holds the fetch back until the widget is in view.

import React from 'react';

import { DEFAULT_PAGE_SIZE } from '@/features/reports/view/viewFormatModel';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { SortClause } from '@/lib/reports.types';

import { useWidgetData } from '../data/useWidgetData';

export function useReportWidget(widget: WidgetResponse, enabled = true) {
  const [page, setPage] = React.useState(0);
  const [size, setSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = React.useState<SortClause | null>(null);
  const query = useWidgetData(widget, page, size, sort, enabled);
  return {
    ...query,
    page,
    size,
    sort,
    setPage,
    setSize: (next: number) => {
      setSize(next);
      setPage(0);
    },
    setSort: (next: SortClause | null) => {
      setSort(next);
      setPage(0);
    },
  };
}

export type ReportWidgetState = ReturnType<typeof useReportWidget>;
