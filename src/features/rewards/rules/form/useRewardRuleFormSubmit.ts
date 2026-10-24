'use client';

import { useCreateRewardRule, useUpdateRewardRule } from '@/features/rewards/queries/useRewardRulesQueries';
import { type RewardNotifier, sonnerRewardNotifier } from '@/features/rewards/rewardNotifier';
import { RewardCapBucket, RewardRule, RewardRuleRequest } from '@/lib/rewards.types';
import { toCalendarDate } from '@/lib/utils';

import { numOrNull } from './constants';
import type { RewardRuleFormFields } from './useRewardRuleFormFields';

interface UseRewardRuleFormSubmitProps {
  accountId: string;
  capBuckets: RewardCapBucket[];
  rule?: RewardRule;
  cloneFrom?: RewardRule;
  defaultPriority: number;
  onSaved: () => void;
  fields: RewardRuleFormFields;
  notify?: RewardNotifier;
}

/** Validation + save for the rule dialog — builds the request body and fires the create/update mutation. */
export function useRewardRuleFormSubmit({
  accountId,
  capBuckets,
  rule,
  cloneFrom,
  defaultPriority,
  onSaved,
  fields,
  notify = sonnerRewardNotifier,
}: UseRewardRuleFormSubmitProps) {
  const isUpdateMode = !!rule;
  const createRule = useCreateRewardRule();
  const updateRuleMutation = useUpdateRewardRule();
  const isSubmitting = createRule.isPending || updateRuleMutation.isPending;

  const {
    name, cardId, counterScope, stacking, activeFrom, activeTo, selectedCategories, mccText, channels,
    daysOfWeek, merchantPattern, merchantMatch, minAmount, maxAmount, emiTreatment, intlTreatment, feeTreatment,
    rewardType, accrualType, percentRate, rounding, slabSize, pointsPerSlab, pointPrecision, isTiered, tierWindow,
    tierRows, perTxnCap, capMode, periodCap, capWindow, capBucketId, onCapExhausted,
  } = fields;

  const onSubmit = () => {
    if (!name.trim()) {
      notify.error('Rule name is required.');
      return;
    }
    const mccs = mccText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const badMcc = mccs.find((m) => !/^\d{4}$/.test(m));
    if (badMcc) {
      notify.error(`MCC must be a 4-digit code: ${badMcc}`);
      return;
    }
    if (!isTiered && accrualType === 'PERCENT' && !percentRate.trim()) {
      notify.error('Percent rate is required (0 models an exclusion).');
      return;
    }
    if (accrualType === 'SLAB' && !slabSize.trim()) {
      notify.error('Slab size is required.');
      return;
    }
    if (!isTiered && accrualType === 'SLAB' && !pointsPerSlab.trim()) {
      notify.error(
        rewardType === 'POINTS'
          ? 'Points per slab is required.'
          : 'Cashback per slab is required.'
      );
      return;
    }
    if (isTiered) {
      if (tierRows.length < 2) {
        notify.error('A tiered rate needs at least two tiers.');
        return;
      }
      if (tierRows.some((t) => !t.rate.trim())) {
        notify.error('Every tier needs a rate.');
        return;
      }
      if (
        tierRows
          .slice(0, -1)
          .some((t) => !t.upTo.trim() || Number(t.upTo) <= 0)
      ) {
        notify.error(
          'Every tier except the last needs a positive “up to” breakpoint.'
        );
        return;
      }
    }
    if (capMode === 'BUCKET' && !capBucketId) {
      notify.error('Pick a shared cap bucket, or switch to a different cap mode.');
      return;
    }
    const chosenBucket =
      capMode === 'BUCKET'
        ? capBuckets.find((b) => b.id === capBucketId)
        : undefined;
    if (chosenBucket && chosenBucket.rewardType !== rewardType) {
      notify.error(
        `“${chosenBucket.name}” is a ${
          chosenBucket.rewardType === 'POINTS' ? 'points' : 'cash'
        } bucket — pick one matching this rule’s reward type.`
      );
      return;
    }
    if (capMode === 'OWN' && !(Number(periodCap) > 0)) {
      notify.error(
        'Enter a positive period cap, or switch cap mode to “No period cap”.'
      );
      return;
    }
    if (merchantPattern.trim() && merchantMatch === 'NONE') {
      notify.error('Pick how the merchant pattern should match.');
      return;
    }

    const body: RewardRuleRequest = {
      accountId,
      cardholderId: cardId || null,
      counterScope,
      name: name.trim(),
      priority: rule?.priority ?? cloneFrom?.priority ?? defaultPriority,
      stacking,
      activeFrom: activeFrom ? toCalendarDate(activeFrom) : null,
      activeTo: activeTo ? toCalendarDate(activeTo) : null,
      categoryIds: selectedCategories.map((c) => c.id),
      mccs,
      channels,
      daysOfWeek,
      merchantPattern: merchantPattern.trim() || null,
      merchantMatch:
        merchantPattern.trim() && merchantMatch !== 'NONE'
          ? merchantMatch
          : null,
      minAmount: numOrNull(minAmount),
      maxAmount: numOrNull(maxAmount),
      emiTreatment,
      intlTreatment,
      feeTreatment,
      rewardType,
      accrualType,
      percentRate:
        accrualType === 'PERCENT' && !isTiered ? numOrNull(percentRate) : null,
      rounding: accrualType === 'PERCENT' ? rounding : null,
      slabSize: accrualType === 'SLAB' ? numOrNull(slabSize) : null,
      pointsPerSlab:
        accrualType === 'SLAB' && !isTiered ? numOrNull(pointsPerSlab) : null,
      pointPrecision:
        accrualType === 'SLAB' ? Number(pointPrecision) || 0 : null,
      tierWindow: isTiered ? tierWindow : null,
      tiers: isTiered
        ? tierRows.map((t, i) => ({
            upTo: i === tierRows.length - 1 ? null : Number(t.upTo),
            rate: Number(t.rate),
          }))
        : null,
      perTxnCap: numOrNull(perTxnCap),
      periodCap: capMode === 'OWN' ? numOrNull(periodCap) : null,
      capWindow: capMode === 'OWN' && periodCap.trim() ? capWindow : null,
      capBucketId: capMode === 'BUCKET' ? capBucketId || null : null,
      onCapExhausted,
    };

    const onSuccess = () => {
      notify.success(isUpdateMode ? 'Rule updated' : 'Rule created');
      onSaved();
    };
    const onError = (e: unknown) => notify.failure(e, 'Failed to save reward rule');

    if (isUpdateMode && rule) {
      updateRuleMutation.mutate({ id: rule.id, body }, { onSuccess, onError });
    } else {
      createRule.mutate(body, { onSuccess, onError });
    }
  };

  return { isUpdateMode, isSubmitting, onSubmit };
}
