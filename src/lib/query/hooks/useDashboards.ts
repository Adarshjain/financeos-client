'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { DashboardResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

export function useDashboards(initialData?: DashboardResponse[]) {
  return useQuery({
    queryKey: keys.dashboards.list(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/dashboards');
      return data ?? [];
    },
    initialData,
  });
}

export function useDashboard(id: string, initialData?: DashboardResponse) {
  return useQuery({
    queryKey: keys.dashboards.byId(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/dashboards/{id}', {
        params: { path: { id } },
      });
      return data ?? null;
    },
    enabled: Boolean(id),
    initialData,
  });
}
