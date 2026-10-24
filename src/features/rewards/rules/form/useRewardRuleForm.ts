'use client';

import { useRewardRulePreview } from '@/features/rewards/preview/useRewardRulePreview';
import type { RewardNotifier } from '@/features/rewards/rewardNotifier';
import { Category } from '@/lib/categories.types';
import { RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';

import { useRewardRuleFormFields } from './useRewardRuleFormFields';
import { useRewardRuleFormSubmit } from './useRewardRuleFormSubmit';

interface UseRewardRuleFormProps {
  accountId: string;
  categories: Category[];
  capBuckets: RewardCapBucket[];
  defaultRewardType: RewardType;
  rule?: RewardRule;
  cloneFrom?: RewardRule;
  defaultPriority: number;
  onSaved: () => void;
  /** How validation and save results are shown; default Legacy's toasts. */
  notify?: RewardNotifier;
}

/**
 * Composes the rule dialog's state (`useRewardRuleFormFields`), its live
 * "test this rule" preview (`useRewardRulePreview`) and its save flow
 * (`useRewardRuleFormSubmit`) into the single flat shape `RewardRuleForm`
 * consumes — split three ways purely to keep each piece under the file-size
 * limit, not because the pieces are reusable independently.
 */
export function useRewardRuleForm({
  accountId,
  categories,
  capBuckets,
  defaultRewardType,
  rule,
  cloneFrom,
  defaultPriority,
  onSaved,
  notify,
}: UseRewardRuleFormProps) {
  const fields = useRewardRuleFormFields({ categories, defaultRewardType, rule, cloneFrom });
  const preview = useRewardRulePreview(fields);
  const { isUpdateMode, isSubmitting, onSubmit } = useRewardRuleFormSubmit({
    accountId,
    capBuckets,
    rule,
    cloneFrom,
    defaultPriority,
    onSaved,
    fields,
    notify,
  });

  return {
    ...fields,
    isUpdateMode,
    preview,
    isSubmitting,
    onSubmit,
  };
}
