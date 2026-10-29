import type { SearchParamsRecord } from '@/features/shell/searchParams';

import type { RewardsSearchParams } from './rewardsData';

/** The rewards tab's own keys out of the address; anything else in it is dropped. */
export function parseRewardsUrl(params: SearchParamsRecord): RewardsSearchParams {
  const { rule, period, from, to, page, size } = params;
  return { rule, period, from, to, page, size };
}
