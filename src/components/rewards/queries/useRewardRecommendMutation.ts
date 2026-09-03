'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { RewardRecommendationRequest } from '@/lib/rewards.types';

/**
 * The card-picker simulation is read-only server-side (it computes and returns
 * a result, nothing is persisted) but is modeled as a mutation since it's
 * triggered on demand rather than kept fresh in the background. Nothing
 * changes server-side, so there is no cache to invalidate on success.
 */
export function useRecommendCards() {
  return useMutation({
    mutationFn: (body: RewardRecommendationRequest) =>
      api.POST('/api/v1/reward-recommendations', { body }).then((r) => r.data!),
  });
}
