'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';
import type { MatchType } from '@/lib/rules.types';

import { loadRuleMatches } from './ruleActions';

/**
 * One page of the transactions a pattern matches (manually reviewed ones left out), fetched by the server a page at a time.
 * A new pattern or match type starts again at the first page.
 */
export function useRuleMatches({
  merchantKey,
  matchType,
  size,
  enabled = true,
}: {
  merchantKey: string;
  matchType: MatchType;
  size: number;
  enabled?: boolean;
}) {
  const key = `${matchType}|${merchantKey}`;
  const [paging, setPaging] = React.useState({ key, page: 0 });
  const page = paging.key === key ? paging.page : 0;

  const query = useQuery({
    queryKey: keys.rules.preview({ merchantKey, matchType, page, size }),
    queryFn: () => unwrapAction(loadRuleMatches(merchantKey, matchType, page, size)),
    enabled,
    placeholderData: keepPreviousData,
  });

  return {
    page,
    setPage: (next: number) => setPaging({ key, page: next }),
    matches: query.data ?? null,
    // A new pattern or page shows the loading state, not the old rows, until its answer lands.
    loading: query.isLoading || query.isPlaceholderData,
    failed: query.isError,
    fetching: query.isFetching,
    refetch: () => void query.refetch(),
  };
}
