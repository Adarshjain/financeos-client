'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CategoryPick } from '@/lib/categoryList.types';
import { loadCategoryRecent } from '@/lib/query/actions/uncategorizedActions';
import { keys } from '@/lib/query/keys';

const NO_PICKS: CategoryPick[] = [];

/** The picks the user made lately for money out or in: the picker's one-tap line. Read while the picker is open. */
export function useCategoryRecent(direction: 'OUT' | 'IN', enabled = true) {
  const query = useQuery({
    queryKey: keys.transactions.categoryRecent(direction),
    queryFn: () => unwrapAction(loadCategoryRecent(direction)),
    enabled,
    staleTime: 0,
  });
  return query.data ?? NO_PICKS;
}
