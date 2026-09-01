'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  deleteRewardRule,
  getRewardAccountConfig,
  listRewardCapBuckets,
  listRewardRules,
  reorderRewardRules,
  updateRewardAccountConfig,
  updateRewardRule,
} from '@/actions/rewards';
import { RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';
import { formatDate, toCalendarDate } from '@/lib/utils';

interface UseRewardRulesManagerProps {
  initialAccountId: string;
  initialRules: RewardRule[];
  initialCapBuckets: RewardCapBucket[];
  initialAnniversaryDate: string | null;
  initialDefaultRewardType: RewardType;
  initialPointValueInr?: number | null;
}

export function useRewardRulesManager({
  initialAccountId,
  initialRules,
  initialCapBuckets,
  initialAnniversaryDate,
  initialDefaultRewardType,
  initialPointValueInr,
}: UseRewardRulesManagerProps) {
  const [accountId, setAccountId] = useState<string>(initialAccountId);
  const [rules, setRules] = useState<RewardRule[]>(initialRules);
  const [capBuckets, setCapBuckets] = useState<RewardCapBucket[]>(initialCapBuckets);
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(initialAnniversaryDate);
  const [defaultRewardType, setDefaultRewardType] = useState<RewardType>(initialDefaultRewardType);
  const [pointValueInr, setPointValueInr] = useState<string>(
    initialPointValueInr != null ? String(initialPointValueInr) : ''
  );
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | undefined>();
  const [cloneSource, setCloneSource] = useState<RewardRule | undefined>();

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    const [rulesRes, bucketsRes, configRes] = await Promise.all([
      listRewardRules(id),
      listRewardCapBuckets(id),
      getRewardAccountConfig(id),
    ]);
    if (rulesRes.success) {
      setRules(rulesRes.data);
    } else {
      toast.error(rulesRes.error.message);
    }
    if (bucketsRes.success) {
      setCapBuckets(bucketsRes.data);
    } else {
      toast.error(bucketsRes.error.message);
    }
    if (configRes.success) {
      setAnniversaryDate(configRes.data.rewardAnniversaryDate ?? null);
      setDefaultRewardType(configRes.data.defaultRewardType ?? 'CASH');
      setPointValueInr(
        configRes.data.pointValueInr != null
          ? String(configRes.data.pointValueInr)
          : ''
      );
    }
    setLoading(false);
  }, []);

  const saveDefaultRewardType = async (type: RewardType) => {
    setDefaultRewardType(type);
    const num = pointValueInr.trim() ? parseFloat(pointValueInr) : null;
    const res = await updateRewardAccountConfig({
      accountId,
      defaultRewardType: type,
      pointValueInr: num,
    });
    if (res.success) {
      toast.success(
        type === 'POINTS'
          ? 'Card now defaults to reward points'
          : 'Card now defaults to cash'
      );
    } else {
      toast.error(res.error.message);
      void refresh(accountId);
    }
  };

  const savePointValueInr = async (valStr: string) => {
    const num = valStr.trim() ? parseFloat(valStr) : null;
    if (num != null && (isNaN(num) || num <= 0)) {
      toast.error('Point value must be greater than ₹0');
      return;
    }
    const res = await updateRewardAccountConfig({
      accountId,
      defaultRewardType,
      pointValueInr: num,
    });
    if (res.success) {
      toast.success(
        num != null
          ? `Point value set to ₹${num}/pt`
          : 'Point value reset to default (₹0.25/pt)'
      );
      setPointValueInr(
        res.data.pointValueInr != null ? String(res.data.pointValueInr) : ''
      );
    } else {
      toast.error(res.error.message);
    }
  };

  const refreshBuckets = useCallback(async () => {
    const res = await listRewardCapBuckets(accountId);
    if (res.success) {
      setCapBuckets(res.data);
    } else {
      toast.error(res.error.message);
    }
  }, [accountId]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(accountId);
  }, [accountId, refresh]);

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const reordered = [...rules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRules(reordered);
    const res = await reorderRewardRules({
      accountId,
      orderedIds: reordered.map((r) => r.id),
    });
    if (res.success) {
      setRules(res.data);
    } else {
      toast.error(res.error.message);
      void refresh(accountId);
    }
  };

  const remove = async (rule: RewardRule) => {
    if (
      !window.confirm(
        `Delete rule "${rule.name}"? Historical reports will no longer see it.`
      )
    )
      return;
    const res = await deleteRewardRule(rule.id);
    if (res.success) {
      toast.success('Rule deleted');
      void refresh(accountId);
    } else {
      toast.error(res.error.message);
    }
  };

  const endDateAndClone = async (rule: RewardRule) => {
    const today = toCalendarDate(new Date());
    if (rule.activeFrom && rule.activeFrom >= today) {
      toast.error('Rule starts today or later — just edit it directly.');
      return;
    }
    if (rule.activeTo && rule.activeTo <= today) {
      toast.error('Rule already ended — use Clone to create a successor.');
      return;
    }
    const res = await updateRewardRule(rule.id, {
      name: rule.name,
      priority: rule.priority,
      stacking: rule.stacking,
      activeFrom: rule.activeFrom,
      activeTo: today,
      categoryIds: rule.categories.map((c) => c.id),
      mccs: rule.mccs,
      channels: rule.channels,
      daysOfWeek: rule.daysOfWeek,
      merchantPattern: rule.merchantPattern,
      merchantMatch: rule.merchantMatch,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount,
      emiTreatment: rule.emiTreatment,
      intlTreatment: rule.intlTreatment,
      feeTreatment: rule.feeTreatment,
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
      onCapExhausted: rule.onCapExhausted,
    });
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      `"${rule.name}" ended ${formatDate(today)} — configure its successor`
    );
    setCloneSource(res.data);
    void refresh(accountId);
  };

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
    anniversaryDate,
    defaultRewardType,
    pointValueInr,
    setPointValueInr,
    loading,
    setLoading,
    isCreateOpen,
    setIsCreateOpen,
    editingRule,
    setEditingRule,
    cloneSource,
    setCloneSource,
    refresh,
    refreshBuckets,
    saveDefaultRewardType,
    savePointValueInr,
    move,
    remove,
    endDateAndClone,
    closeForm,
  };
}
