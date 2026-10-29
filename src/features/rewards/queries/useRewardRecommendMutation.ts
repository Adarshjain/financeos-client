'use client';

import { useMutation } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { RewardRecommendationRequest } from '@/lib/rewards.types';

import { recommendRewardCards } from '../actions';

/**
 * The card-picker simulation is read-only server-side (it computes and returns
 * a result, nothing is persisted) but is modeled as a mutation since it's
 * triggered on demand rather than kept fresh in the background. Nothing
 * changes server-side, so there is no cache to invalidate on success.
 */
export function useRecommendCards() {
  return useMutation({
    mutationFn: (body: RewardRecommendationRequest) => unwrapAction(recommendRewardCards(body)),
  });
}
