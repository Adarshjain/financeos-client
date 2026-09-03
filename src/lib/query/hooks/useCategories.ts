'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';

export function useCategories(initialData?: Category[]) {
  const query = useQuery({
    queryKey: keys.categories.list(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/categories');
      return data ?? [];
    },
    initialData,
  });

  return query;
}
