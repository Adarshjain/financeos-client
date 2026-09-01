'use client';

import { Coins, Loader2, Plus } from 'lucide-react';

import RewardCapBucketsManager from '@/components/rewards/RewardCapBucketsManager';
import RewardMilestonesManager from '@/components/rewards/RewardMilestonesManager';
import RewardRuleForm from '@/components/rewards/RewardRuleForm';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

import { AccountConfigHeader } from './rules-manager/AccountConfigHeader';
import { RuleCardItem } from './rules-manager/RuleCardItem';
import { useRewardRulesManager } from './rules-manager/useRewardRulesManager';

interface RewardRulesManagerProps {
  accounts: Account[];
  categories: Category[];
  initialAccountId: string;
  initialRules: RewardRule[];
  initialCapBuckets: RewardCapBucket[];
  initialAnniversaryDate: string | null;
  initialDefaultRewardType: RewardType;
  initialPointValueInr?: number | null;
}

export default function RewardRulesManager({
  accounts,
  categories,
  initialAccountId,
  initialRules,
  initialCapBuckets,
  initialAnniversaryDate,
  initialDefaultRewardType,
  initialPointValueInr,
}: RewardRulesManagerProps) {
  const orderedAccounts = accounts;
  const {
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
  } = useRewardRulesManager({
    initialAccountId,
    initialRules,
    initialCapBuckets,
    initialAnniversaryDate,
    initialDefaultRewardType,
    initialPointValueInr,
  });

  const today = toCalendarDate(new Date());
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isBank = selectedAccount?.type === AccountType.BANK_ACCOUNT;
  const cardholders =
    selectedAccount?.type === AccountType.CREDIT_CARD || isBank
      ? selectedAccount.cardholders
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop action bar */}
      <div className="flex items-center gap-1 w-full flex-wrap">
        <Select
          value={accountId}
          onValueChange={(v) => {
            setLoading(true);
            setAccountId(v);
          }}
        >
          <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs h-8 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-56">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            {orderedAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs font-medium">
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
        )}
        <div className="flex-1" />
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!accountId}
          variant="outline"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New Rule
        </Button>
      </div>

      {/* Anniversary anchor & Card Config row */}
      <AccountConfigHeader
        anniversaryDate={anniversaryDate}
        defaultRewardType={defaultRewardType}
        loading={loading}
        onSaveDefaultRewardType={saveDefaultRewardType}
        pointValueInr={pointValueInr}
        setPointValueInr={setPointValueInr}
        onSavePointValueInr={savePointValueInr}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Rules are evaluated top-down: the first matching{' '}
        <span className="font-semibold">exclusive</span> rule pays (falling through
        when its cap is exhausted);{' '}
        <span className="font-semibold">additive</span> rules stack on top. To
        devalue a rule, end-date it and create a successor — never rewrite history.
      </p>

      {/* Rule cards, evaluation order */}
      {rules.length === 0 && !loading ? (
        <EmptyState
          icon={Coins}
          title="No reward rules on this account yet"
          description="Start with a base rule (e.g. “1% on everything”), then add category bonuses and exclusions above it."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule, index) => (
            <RuleCardItem
              key={rule.id}
              rule={rule}
              index={index}
              totalRules={rules.length}
              today={today}
              onMove={move}
              onEdit={setEditingRule}
              onClone={setCloneSource}
              onEndDateAndClone={endDateAndClone}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {/* Shared cap buckets + milestones for the same account */}
      <RewardCapBucketsManager
        accountId={accountId}
        buckets={capBuckets}
        onChanged={() => void refreshBuckets()}
      />
      <RewardMilestonesManager
        accountId={accountId}
        cards={cardholders}
        categories={categories}
        defaultRewardType={defaultRewardType}
        isBank={isBank}
      />

      {(isCreateOpen || editingRule || cloneSource) && (
        <RewardRuleForm
          key={editingRule?.id ?? cloneSource?.id ?? 'create'}
          accountId={accountId}
          cards={cardholders}
          categories={categories}
          capBuckets={capBuckets}
          defaultRewardType={defaultRewardType}
          rule={editingRule}
          cloneFrom={cloneSource}
          defaultPriority={
            (rules.length ? Math.max(...rules.map((r) => r.priority)) : 0) + 1
          }
          isBank={isBank}
          open
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            void refresh(accountId);
          }}
        />
      )}
    </div>
  );
}
