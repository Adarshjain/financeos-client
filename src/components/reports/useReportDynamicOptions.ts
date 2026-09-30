'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DYNAMIC_OPTIONS_FAILED, type DynamicOptions } from '@/components/reports/catalog';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

/**
 * Filter dropdown values for the datasource's dynamic enum fields (card, rule, loan,
 * counterparty, …), served by the API: the values that occur in the user's data. Each
 * option carries the value a filter stores (a stable id where the field has one) and its
 * label. Fetched only once a filter uses a dynamic field, since computed datasources
 * evaluate the user's whole history to answer; refetched whenever the builder remounts
 * or the window regains focus, so newly added rules and transactions show up. A field is
 * absent from the result until its values have loaded; a failed request is flagged with
 * DYNAMIC_OPTIONS_FAILED.
 */
export function useReportDynamicOptions(
  datasource: string,
  catalog: DatasourceCatalog,
  filters: FilterClause[],
): DynamicOptions {
  const needed = filters.some((f) =>
    catalog.fields.some((field) => field.name === f.field && field.dynamic),
  );

  const { data, isError } = useQuery({
    queryKey: keys.reports.fieldValues(datasource),
    queryFn: async () => {
      const { data: body } = await api.GET('/api/v1/report/datasource/{name}/values', {
        params: { path: { name: datasource } },
      });
      return body?.options ?? {};
    },
    enabled: needed,
  });

  return useMemo(() => {
    if (isError && !data) {
      return { [DYNAMIC_OPTIONS_FAILED]: true } as DynamicOptions;
    }
    const options: DynamicOptions = {};
    for (const [field, values] of Object.entries(data ?? {})) {
      options[field] = values.map((o) => ({ id: o.value, name: o.label }));
    }
    return options;
  }, [data, isError]);
}
