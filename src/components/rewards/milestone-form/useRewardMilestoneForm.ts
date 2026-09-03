'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateRewardMilestone,
  useUpdateRewardMilestone,
} from '@/components/rewards/queries/useRewardMilestonesQueries';
import { ApiError } from '@/lib/api/client';
import { Category } from '@/lib/categories.types';
import {
  MilestoneBasis,
  MilestonePayoutTiming,
  MilestonePayoutType,
  MilestoneWindow,
  RewardMilestone,
  RewardMilestoneRequest,
  RewardType,
} from '@/lib/rewards.types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

interface UseRewardMilestoneFormProps {
  accountId: string;
  categories: Category[];
  defaultRewardType: RewardType;
  milestone?: RewardMilestone;
  onSaved: () => void;
}

export function useRewardMilestoneForm({
  accountId,
  categories,
  defaultRewardType,
  milestone,
  onSaved,
}: UseRewardMilestoneFormProps) {
  const isUpdateMode = !!milestone;

  const [name, setName] = useState(milestone?.name ?? '');
  const [cardId, setCardId] = useState<string | null>(milestone?.cardholderId ?? null);
  const [windowType, setWindowType] = useState<MilestoneWindow>(
    milestone?.windowType ?? 'CALENDAR_MONTH'
  );
  const [basis, setBasis] = useState<MilestoneBasis>(milestone?.basis ?? 'SPEND');
  const [threshold, setThreshold] = useState(
    milestone?.threshold != null ? String(milestone.threshold) : ''
  );
  const [minTxnAmount, setMinTxnAmount] = useState(
    milestone?.minTxnAmount != null ? String(milestone.minTxnAmount) : ''
  );
  const [payoutType, setPayoutType] = useState<MilestonePayoutType>(
    milestone?.payoutType ?? 'CASH_VALUE'
  );
  const [rewardType, setRewardType] = useState<RewardType>(
    milestone?.rewardType ?? defaultRewardType
  );
  const [payoutValue, setPayoutValue] = useState(
    milestone?.payoutValue != null ? String(milestone.payoutValue) : ''
  );
  const [payoutTiming, setPayoutTiming] = useState<MilestonePayoutTiming>(
    milestone?.payoutTiming ?? 'WINDOW_END'
  );

  const toCategoryOptions = (ids: string[]): Category[] =>
    ids.map(
      (id) => categories.find((c) => c.id === id) ?? { id, name: 'Unknown category' }
    );
  const [includeCategories, setIncludeCategories] = useState<Category[]>(
    milestone ? toCategoryOptions(milestone.includeCategoryIds) : []
  );
  const [excludeCategories, setExcludeCategories] = useState<Category[]>(
    milestone ? toCategoryOptions(milestone.excludeCategoryIds) : []
  );
  const [includeMccs, setIncludeMccs] = useState(
    milestone?.includeMccs.join(', ') ?? ''
  );
  const [excludeMccs, setExcludeMccs] = useState(
    milestone?.excludeMccs.join(', ') ?? ''
  );
  const [activeFrom, setActiveFrom] = useState<Date | undefined>(
    milestone?.activeFrom ? parseCalendarDate(milestone.activeFrom) : undefined
  );
  const [activeTo, setActiveTo] = useState<Date | undefined>(
    milestone?.activeTo ? parseCalendarDate(milestone.activeTo) : undefined
  );

  const createMilestone = useCreateRewardMilestone();
  const updateMilestoneMutation = useUpdateRewardMilestone();
  const isSubmitting = createMilestone.isPending || updateMilestoneMutation.isPending;

  const parseMccList = (text: string) =>
    text
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

  const onSubmit = () => {
    if (!name.trim()) {
      toast.error('Milestone name is required.');
      return;
    }
    const thresholdValue = Number(threshold);
    if (!threshold.trim() || Number.isNaN(thresholdValue) || thresholdValue <= 0) {
      toast.error('Threshold must be a positive number.');
      return;
    }
    if (
      payoutType === 'CASH_VALUE' &&
      (!payoutValue.trim() || Number(payoutValue) <= 0)
    ) {
      toast.error('Payout value is required for a value-paying milestone.');
      return;
    }
    if (windowType === 'ONE_TIME' && (!activeFrom || !activeTo)) {
      toast.error('A one-time milestone needs both a start date and a deadline.');
      return;
    }
    const badMcc = [
      ...parseMccList(includeMccs),
      ...parseMccList(excludeMccs),
    ].find((m) => !/^\d{4}$/.test(m));
    if (badMcc) {
      toast.error(`MCC must be a 4-digit code: ${badMcc}`);
      return;
    }
    const body: RewardMilestoneRequest = {
      accountId,
      cardholderId: cardId || null,
      name: name.trim(),
      windowType,
      basis,
      threshold: thresholdValue,
      minTxnAmount:
        basis === 'TXN_COUNT' && minTxnAmount.trim()
          ? Number(minTxnAmount)
          : null,
      payoutType,
      rewardType,
      payoutValue: payoutType === 'CASH_VALUE' ? Number(payoutValue) : null,
      payoutTiming,
      includeCategoryIds: includeCategories.map((c) => c.id),
      includeMccs: parseMccList(includeMccs),
      excludeCategoryIds: excludeCategories.map((c) => c.id),
      excludeMccs: parseMccList(excludeMccs),
      activeFrom: activeFrom ? toCalendarDate(activeFrom) : null,
      activeTo: activeTo ? toCalendarDate(activeTo) : null,
    };
    const onSuccess = () => {
      toast.success(isUpdateMode ? 'Milestone updated' : 'Milestone created');
      onSaved();
    };
    const onError = (e: unknown) =>
      toast.error(e instanceof ApiError ? e.response.message : 'Failed to save milestone');
    if (isUpdateMode && milestone) {
      updateMilestoneMutation.mutate({ id: milestone.id, body }, { onSuccess, onError });
    } else {
      createMilestone.mutate(body, { onSuccess, onError });
    }
  };

  return {
    isUpdateMode,
    name,
    setName,
    cardId,
    setCardId,
    windowType,
    setWindowType,
    basis,
    setBasis,
    threshold,
    setThreshold,
    minTxnAmount,
    setMinTxnAmount,
    payoutType,
    setPayoutType,
    rewardType,
    setRewardType,
    payoutValue,
    setPayoutValue,
    payoutTiming,
    setPayoutTiming,
    includeCategories,
    setIncludeCategories,
    includeMccs,
    setIncludeMccs,
    excludeCategories,
    setExcludeCategories,
    excludeMccs,
    setExcludeMccs,
    activeFrom,
    setActiveFrom,
    activeTo,
    setActiveTo,
    isSubmitting,
    onSubmit,
  };
}
