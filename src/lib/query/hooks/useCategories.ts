'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { Category } from '@/lib/categories.types';
import { loadCategories } from '@/lib/query/actions/categoryActions';
import { keys } from '@/lib/query/keys';

export function useCategories(initialData?: Category[]) {
  const query = useQuery({
    queryKey: keys.categories.list(),
    queryFn: () => unwrapAction(loadCategories()),
    initialData,
  });

  return query;
}
