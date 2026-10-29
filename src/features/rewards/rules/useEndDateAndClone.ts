'use client';

import { useUpdateRewardRule } from '@/features/rewards/queries/useRewardRulesQueries';
import { type RewardNotifier, sonnerRewardNotifier } from '@/features/rewards/rewardNotifier';
import { formatDate } from '@/lib/format';
import { RewardRule } from '@/lib/rewards.types';
import { toCalendarDate } from '@/lib/utils';

/** Ends a rule today (activeTo) and hands the updated rule to onEnded so the caller can open a successor form. */
export function useEndDateAndClone(onEnded: (updated: RewardRule) => void, notify: RewardNotifier = sonnerRewardNotifier) {
  const updateRule = useUpdateRewardRule();
  return (rule: RewardRule) => {
    const today = toCalendarDate(new Date());
    if (rule.activeFrom && rule.activeFrom >= today) {
      notify.error('Rule starts today or later — just edit it directly.');
      return;
    }
    if (rule.activeTo && rule.activeTo <= today) {
      notify.error('Rule already ended — use Clone to create a successor.');
      return;
    }
    updateRule.mutate(
      {
        id: rule.id,
        body: {
          name: rule.name,
          priority: rule.priority,
          stacking: rule.stacking,
          activeFrom: rule.activeFrom,
          activeTo: today,
          categoryIds: rule.categories?.map((c) => c.id),
          mccs: rule.mccs ?? undefined,
          channels: rule.channels ?? undefined,
          daysOfWeek: rule.daysOfWeek ?? undefined,
          merchantPattern: rule.merchantPattern,
          merchantMatch: rule.merchantMatch,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          emiTreatment: rule.emiTreatment ?? undefined,
          intlTreatment: rule.intlTreatment ?? undefined,
          feeTreatment: rule.feeTreatment ?? undefined,
          rewardType: rule.rewardType,
          accrualType: rule.accrualType,
          percentRate: rule.percentRate,
          rounding: rule.rounding,
          slabSize: rule.slabSize,
          pointsPerSlab: rule.pointsPerSlab,
          pointPrecision: rule.pointPrecision,
          tierWindow: rule.tierWindow,
          tiers: rule.tiers,
          perTxnCap: rule.perTxnCap,
          periodCap: rule.periodCap,
          capWindow: rule.capWindow,
          capBucketId: rule.capBucketId,
          onCapExhausted: rule.onCapExhausted ?? undefined,
        },
      },
      {
        onSuccess: (updated) => {
          notify.success(`"${rule.name}" ended ${formatDate(today, 'list')} — configure its successor`);
          onEnded(updated);
        },
        onError: (e) => notify.failure(e, "Couldn't update the reward rule. Try again."),
      }
    );
  };
}
