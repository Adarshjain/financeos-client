'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { PagedRewardLines, RewardLine } from '@/lib/rewards.types';

/**
 * `earnedUnit` is typed as a bare `string` in the generated schema (should be
 * the `"RUPEES" | "POINTS"` enum the backend actually returns) — narrow it
 * explicitly instead of widening `RewardLine.earnedUnit` everywhere
 * downstream. See "Spec follow-ups" in the migration report.
 */
function toRewardLine(line: Schemas['RewardLineResponse']): RewardLine {
  return { ...line, earnedUnit: line.earnedUnit === 'POINTS' ? 'POINTS' : 'RUPEES' };
}

export function useRewardReport(accountId: string, from: string, to: string) {
  return useQuery({
    queryKey: keys.rewards.report(accountId, from, to),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/rewards/report', {
        params: { query: { accountId, from, to } },
      });
      return data!;
    },
    enabled: Boolean(accountId && from && to),
  });
}

export interface RewardLinesParams {
  accountId: string;
  from: string;
  to: string;
  ruleId?: string;
  page: number;
  size: number;
}

export function useRewardLines(params: RewardLinesParams) {
  return useQuery({
    queryKey: keys.rewards.lines({ ...params }),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/rewards/lines', {
        params: {
          query: {
            accountId: params.accountId,
            from: params.from,
            to: params.to,
            ruleId: params.ruleId,
            page: params.page,
            size: params.size,
            sort: [],
          },
        },
      });
      const page = data!;
      return {
        content: page.content.map(toRewardLine),
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        size: page.size,
        number: page.number,
        first: page.first,
        last: page.last,
        empty: page.empty,
      } satisfies PagedRewardLines;
    },
    enabled: Boolean(params.accountId && params.from && params.to),
    placeholderData: keepPreviousData,
  });
}
