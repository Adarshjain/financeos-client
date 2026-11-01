'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { mergeRecentPicks } from '@/lib/categoryList';
import type { CategoryPick } from '@/lib/categoryList.types';
import { loadCategoryRecent } from '@/lib/query/actions/uncategorizedActions';
import { keys } from '@/lib/query/keys';

const NO_PICKS: CategoryPick[] = [];

function useRecent(direction: 'OUT' | 'IN', enabled: boolean) {
  const query = useQuery({
    queryKey: keys.transactions.categoryRecent(direction),
    queryFn: () => unwrapAction(loadCategoryRecent(direction)),
    enabled,
    staleTime: 0,
  });
  return query.data ?? NO_PICKS;
}

/**
 * The picks the user made lately for money out or in: the picker's one-tap line. Read while the picker is open.
 * `ANY` (the rule form) merges both, alternating, each once, at most four.
 */
export function useCategoryRecent(direction: 'OUT' | 'IN' | 'ANY', enabled = true) {
  const out = useRecent('OUT', enabled && direction !== 'IN');
  const inn = useRecent('IN', enabled && direction !== 'OUT');
  if (direction === 'OUT') return out;
  if (direction === 'IN') return inn;
  return mergeRecentPicks(out, inn);
}
