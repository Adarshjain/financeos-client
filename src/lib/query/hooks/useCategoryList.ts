'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CategoryDef } from '@/lib/categoryList.types';
import { loadCategoryList } from '@/lib/query/actions/categoryListActions';
import { keys } from '@/lib/query/keys';

const NO_CATEGORIES: CategoryDef[] = [];

/**
 * The fixed category list. It never changes, so it is fetched once and kept for the session.
 * `enabled: false` holds the fetch back until something needs the list.
 */
export function useCategoryList(initialData?: CategoryDef[], options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: keys.categoryList.all,
    queryFn: () => unwrapAction(loadCategoryList()),
    initialData,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return { list: query.data ?? NO_CATEGORIES, isLoading: query.isLoading, isError: query.isError };
}
