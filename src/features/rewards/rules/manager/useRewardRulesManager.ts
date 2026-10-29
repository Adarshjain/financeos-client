'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useRewardAccountConfig, useUpdateRewardAccountConfig } from '@/features/rewards/queries/useRewardAccountConfigQueries';
import { useRewardCapBuckets } from '@/features/rewards/queries/useRewardCapBucketsQueries';
import {
  useDeleteRewardRule,
  useReorderRewardRules,
  useRewardRules,
} from '@/features/rewards/queries/useRewardRulesQueries';
import { useEndDateAndClone } from '@/features/rewards/rules/useEndDateAndClone';
import { ApiError } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { RewardRule, RewardType } from '@/lib/rewards.types';
import { toastError } from '@/lib/toastError';

interface UseRewardRulesManagerProps {
  initialAccountId: string;
}

export function useRewardRulesManager({ initialAccountId }: UseRewardRulesManagerProps) {
  const [accountId, setAccountId] = useState<string>(initialAccountId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | undefined>();
  const [cloneSource, setCloneSource] = useState<RewardRule | undefined>();

  const rulesQuery = useRewardRules(accountId);
  const capBucketsQuery = useRewardCapBuckets(accountId);
  const configQuery = useRewardAccountConfig(accountId);
  const rules = rulesQuery.data ?? [];
  const capBuckets = capBucketsQuery.data ?? [];
  const loading = rulesQuery.isFetching || capBucketsQuery.isFetching || configQuery.isFetching;

  const [defaultRewardType, setDefaultRewardType] = useState<RewardType>('CASH');
  const [pointValueInr, setPointValueInr] = useState<string>('');

  // Editable account-config fields are seeded from the query only when the
  // selected account changes — not on every background refetch — so a
  // refetch (e.g. on window focus) never clobbers an in-progress edit.
  // `configQuery.data.accountId` (rather than just presence of data) guards
  // against the previous account's placeholder data being mistaken for the
  // newly selected account's config while the real fetch is still in flight.
  // Adjusted during render (React's "store info from previous render"
  // pattern) rather than in an effect, so there's no extra commit + refetch
  // window where the form still shows the last account's values.
  const [syncedAccountId, setSyncedAccountId] = useState<string | null>(null);
  if (
    configQuery.data &&
    configQuery.data.accountId === accountId &&
    syncedAccountId !== accountId
  ) {
    setSyncedAccountId(accountId);
    setDefaultRewardType(configQuery.data.defaultRewardType ?? 'CASH');
    setPointValueInr(
      configQuery.data.pointValueInr != null ? String(configQuery.data.pointValueInr) : ''
    );
  }

  const updateConfig = useUpdateRewardAccountConfig();
  const deleteRule = useDeleteRewardRule();
  const reorderRules = useReorderRewardRules();

  

  const saveDefaultRewardType = (type: RewardType) => {
    const previous = defaultRewardType;
    setDefaultRewardType(type);
    const num = pointValueInr.trim() ? parseFloat(pointValueInr) : null;
    updateConfig.mutate(
      { accountId, defaultRewardType: type, pointValueInr: num },
      {
        onSuccess: () =>
          toast.success(
            type === 'POINTS' ? 'Card now defaults to reward points' : 'Card now defaults to cash'
          ),
        onError: (e) => {
          toastError(e, "Couldn't update reward settings. Try again.");
          setDefaultRewardType(previous);
        },
      }
    );
  };

  const savePointValueInr = (valStr: string) => {
    const num = valStr.trim() ? parseFloat(valStr) : null;
    if (num != null && (isNaN(num) || num <= 0)) {
      toast.error('Point value must be greater than ₹0');
      return;
    }
    updateConfig.mutate(
      { accountId, defaultRewardType, pointValueInr: num },
      {
        onSuccess: (data) => {
          toast.success(num != null ? `Point value set to ${formatMoney(num, { decimals: 'auto' })}/pt` : 'Point value reset to default (₹0.25/pt)');
          setPointValueInr(data.pointValueInr != null ? String(data.pointValueInr) : '');
        },
        onError: (e) => toastError(e, "Couldn't update reward settings. Try again."),
      }
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const reordered = [...rules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderRules.mutate(
      { accountId, orderedIds: reordered.map((r) => r.id) },
      { onError: (e) => toastError(e, "Couldn't reorder reward rules. Try again.") }
    );
  };

  const remove = (rule: RewardRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? Historical reports will no longer see it.`)) return;
    deleteRule.mutate(rule.id, {
      onSuccess: () => toast.success('Rule deleted'),
      onError: (e) => toastError(e, "Couldn't delete the reward rule. Try again."),
    });
  };

  const endDateAndClone = useEndDateAndClone(setCloneSource);

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingRule(undefined);
    setCloneSource(undefined);
  };

  return {
    accountId,
    setAccountId,
    rules,
    capBuckets,
    anniversaryDate: configQuery.data?.rewardAnniversaryDate ?? null,
    defaultRewardType,
    pointValueInr,
    setPointValueInr,
    loading,
    isCreateOpen,
    setIsCreateOpen,
    editingRule,
    setEditingRule,
    cloneSource,
    setCloneSource,
    saveDefaultRewardType,
    savePointValueInr,
    move,
    remove,
    endDateAndClone,
    closeForm,
  };
}
