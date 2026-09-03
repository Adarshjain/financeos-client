'use client';

import { Category } from '@/lib/categories.types';
import { RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';

import { useRewardRuleFormFields } from './useRewardRuleFormFields';
import { useRewardRuleFormSubmit } from './useRewardRuleFormSubmit';
import { useRewardRulePreview } from './useRewardRulePreview';

interface UseRewardRuleFormProps {
  accountId: string;
  categories: Category[];
  capBuckets: RewardCapBucket[];
  defaultRewardType: RewardType;
  rule?: RewardRule;
  cloneFrom?: RewardRule;
  defaultPriority: number;
  onSaved: () => void;
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
  });

  return {
    ...fields,
    isUpdateMode,
    preview,
    isSubmitting,
    onSubmit,
  };
}
