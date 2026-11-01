'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadTags } from '@/lib/query/actions/tagActions';
import { keys } from '@/lib/query/keys';
import type { Tag } from '@/lib/tags.types';

export function useTags(initialData?: Tag[]) {
  return useQuery({
    queryKey: keys.tags.list(),
    queryFn: () => unwrapAction(loadTags()),
    initialData,
  });
}
