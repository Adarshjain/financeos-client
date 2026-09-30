'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { DynamicOptions } from '@/components/reports/catalog';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

/**
 * Filter dropdown values for the datasource's dynamic enum fields (card, rule, loan,
 * counterparty, …), served by the API: the values that occur in the user's data,
 * exactly as the filters compare them. Fetched only once a filter uses a dynamic
 * field, since computed datasources evaluate the user's whole history to answer.
 * A field is absent from the result until its values have loaded.
 */
export function useReportDynamicOptions(
  datasource: string,
  catalog: DatasourceCatalog,
  filters: FilterClause[],
): DynamicOptions {
  const needed = filters.some((f) =>
    catalog.fields.some((field) => field.name === f.field && field.dynamic),
  );

  const { data } = useQuery({
    queryKey: keys.reports.fieldValues(datasource),
    queryFn: async () => {
      const { data: body } = await api.GET('/api/v1/report/datasource/{name}/values', {
        params: { path: { name: datasource } },
      });
      return body?.values ?? {};
    },
    enabled: needed,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const options: DynamicOptions = {};
    for (const [field, values] of Object.entries(data ?? {})) {
      options[field] = values.map((v) => ({ id: v, name: v }));
    }
    return options;
  }, [data]);
}
