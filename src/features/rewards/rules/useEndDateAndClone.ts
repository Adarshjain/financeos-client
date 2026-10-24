'use client';

import { toast } from 'sonner';

import { useUpdateRewardRule } from '@/features/rewards/queries/useRewardRulesQueries';
import { RewardRule } from '@/lib/rewards.types';
import { toastError } from '@/lib/toastError';
import { formatDate, toCalendarDate } from '@/lib/utils';

/** Ends a rule today (activeTo) and hands the updated rule to onEnded so the caller can open a successor form. */
export function useEndDateAndClone(onEnded: (updated: RewardRule) => void) {
  const updateRule = useUpdateRewardRule();
  return (rule: RewardRule) => {
    const today = toCalendarDate(new Date());
    if (rule.activeFrom && rule.activeFrom >= today) {
      toast.error('Rule starts today or later — just edit it directly.');
      return;
    }
    if (rule.activeTo && rule.activeTo <= today) {
      toast.error('Rule already ended — use Clone to create a successor.');
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
          toast.success(`"${rule.name}" ended ${formatDate(today)} — configure its successor`);
          onEnded(updated);
        },
        onError: (e) => toastError(e, 'Failed to update reward rule'),
      }
    );
  };
}
