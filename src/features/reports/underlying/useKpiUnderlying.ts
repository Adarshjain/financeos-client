'use client';

// Data access for the "View underlying data" dialog: the KPI's rows for one
// period (one page, server-sorted) and the CSV of all of them. The page goes
// through a server action; the CSV is a binary download, so it stays on the
// browser `api` client. The three source kinds map onto the saved / ad-hoc /
// built-in endpoints.

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { loadUnderlying } from '@/features/reports/actions';
import { unwrapAction } from '@/lib/actionResult';
import { api } from '@/lib/api/client'; // binary CSV download: a server action would double the transfer
import { keys } from '@/lib/query/keys';
import type { SortClause } from '@/lib/reports.types';

import { sortParam, sourceKey } from './underlying.helpers';
import type { KpiUnderlyingResponse, UnderlyingPeriod, UnderlyingSource } from './underlying.types';

export interface UnderlyingQuery {
  period: UnderlyingPeriod;
  page: number;
  size: number;
  sort: SortClause | null;
}

function fetchUnderlying(source: UnderlyingSource, q: UnderlyingQuery): Promise<KpiUnderlyingResponse> {
  return unwrapAction(loadUnderlying(source, { period: q.period, page: q.page, size: q.size, sort: sortParam(q.sort) }));
}

/**
 * One page of a period's underlying rows. The previous page stays on screen
 * while the next loads; callers compare `data.period` with the period asked
 * for so a period switch never shows the other period's rows.
 */
export function useKpiUnderlying(source: UnderlyingSource, { period, page, size, sort }: UnderlyingQuery) {
  return useQuery({
    queryKey: keys.reports.underlying(sourceKey(source), {
      period,
      page,
      size,
      ...(sort ? { sort: sortParam(sort) } : {}),
    }),
    queryFn: () => fetchUnderlying(source, { period, page, size, sort }),
    placeholderData: keepPreviousData,
  });
}

/** All of a period's underlying rows as CSV, in the same order as the table. */
export async function fetchUnderlyingCsv(
  source: UnderlyingSource,
  q: Pick<UnderlyingQuery, 'period' | 'sort'>,
): Promise<Blob> {
  const query = { period: q.period, sort: sortParam(q.sort) };
  switch (source.kind) {
    case 'saved': {
      const { data } = await api.POST('/api/v1/reports/{id}/underlying/csv', {
        params: { path: { id: source.reportId }, query },
        parseAs: 'blob',
      });
      return data as Blob;
    }
    case 'adhoc': {
      const { data } = await api.POST('/api/v1/reports/underlying/csv', {
        params: { query },
        body: { ...source.request, definition: { ...source.request.definition } },
        parseAs: 'blob',
      });
      return data as Blob;
    }
    case 'builtin': {
      const { data } = await api.POST('/api/v1/dashboards/builtins/{key}/underlying/csv', {
        params: { path: { key: source.key }, query },
        body: { params: source.params },
        parseAs: 'blob',
      });
      return data as Blob;
    }
  }
}
