'use client';

import { ArrowDown, ArrowUp, CalendarClock, CalendarOff, Coins, Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { deleteRewardRule, getRewardAccountConfig, listRewardCapBuckets, listRewardRules, reorderRewardRules, updateRewardAccountConfig, updateRewardRule } from '@/actions/rewards';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import RewardCapBucketsManager from '@/components/rewards/RewardCapBucketsManager';
import RewardMilestonesManager from '@/components/rewards/RewardMilestonesManager';
import RewardRuleForm from '@/components/rewards/RewardRuleForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { RewardCapBucket, RewardRule, RewardType } from '@/lib/rewards.types';
import { cn, formatDate, toCalendarDate } from '@/lib/utils';

interface RewardRulesManagerProps {
  accounts: Account[];
  categories: Category[];
  initialAccountId: string;
  initialRules: RewardRule[];
  initialCapBuckets: RewardCapBucket[];
  initialAnniversaryDate: string | null;
  initialDefaultRewardType: RewardType;
}

function accrualSummary(rule: RewardRule): string {
  const points = rule.rewardType === 'POINTS';
  if (rule.tiers?.length) {
    const unit = rule.accrualType === 'PERCENT' ? '%' : points ? ` pts/₹${rule.slabSize}` : ` ₹/₹${rule.slabSize}`;
    const schedule = rule.tiers
      .map((t) => (t.upTo != null ? `${t.rate}${unit} to ₹${t.upTo}` : `then ${t.rate}${unit}`))
      .join(', ');
    const suffix = rule.accrualType === 'PERCENT' && points ? ' in points' : '';
    return `tiered: ${schedule}${suffix}`;
  }
  if (rule.accrualType === 'PERCENT') {
    return points ? `${rule.percentRate}% in points` : `${rule.percentRate}% cashback`;
  }
  return points
    ? `${rule.pointsPerSlab} pts / ₹${rule.slabSize}`
    : `₹${rule.pointsPerSlab} / ₹${rule.slabSize}`;
}

const WINDOW_SHORT: Record<string, string> = {
  DAY: 'day',
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
};

function capSummary(rule: RewardRule): string | null {
  // Shared-bucket rules have no own periodCap — surface the bucket by name instead.
  if (rule.capBucketId != null) {
    return `shared cap “${rule.capBucketName ?? 'bucket'}”`;
  }
  if (rule.periodCap == null) return null;
  const window = WINDOW_SHORT[rule.capWindow ?? 'CALENDAR_MONTH'];
  return rule.rewardType === 'POINTS'
    ? `cap ${rule.periodCap} pts/${window}`
    : `cap ₹${rule.periodCap}/${window}`;
}

function matchSummary(rule: RewardRule): string {
  const parts: string[] = [];
  if (rule.categories.length) parts.push(rule.categories.map((c) => c.name).join(', '));
  if (rule.mccs.length) parts.push(`MCC ${rule.mccs.join('/')}`);
  if (rule.merchantPattern) parts.push(`"${rule.merchantPattern}"`);
  if (rule.channels.length) parts.push(rule.channels.join('/').toLowerCase());
  if (rule.daysOfWeek.length) parts.push(rule.daysOfWeek.map((d) => d.slice(0, 3).toLowerCase()).join('/'));
  if (rule.minAmount != null || rule.maxAmount != null) {
    parts.push(`₹${rule.minAmount ?? 0}–${rule.maxAmount ?? '∞'}`);
  }
  if (rule.emiTreatment !== 'INCLUDE') parts.push(rule.emiTreatment === 'EXCLUDE_EMI' ? 'no EMI' : 'EMI only');
  if (rule.intlTreatment !== 'INCLUDE') parts.push(rule.intlTreatment === 'EXCLUDE_INTL' ? 'no intl' : 'intl only');
  return parts.length ? parts.join(' · ') : 'All spends';
}

export default function RewardRulesManager({
  accounts,
  categories,
  initialAccountId,
  initialRules,
  initialCapBuckets,
  initialAnniversaryDate,
  initialDefaultRewardType,
}: RewardRulesManagerProps) {
  // Accounts arrive credit-cards-first from the server page.
  const orderedAccounts = accounts;
  const [accountId, setAccountId] = useState<string>(initialAccountId);
  const [rules, setRules] = useState<RewardRule[]>(initialRules);
  const [capBuckets, setCapBuckets] = useState<RewardCapBucket[]>(initialCapBuckets);
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(initialAnniversaryDate);
  const [defaultRewardType, setDefaultRewardType] = useState<RewardType>(initialDefaultRewardType);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | undefined>();
  const [cloneSource, setCloneSource] = useState<RewardRule | undefined>();

  // No synchronous setState here (react-hooks/set-state-in-effect): callers that
  // want a spinner set loading in their event handler before invoking refresh.
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
    }
    setLoading(false);
  }, []);

  const saveDefaultRewardType = async (type: RewardType) => {
    setDefaultRewardType(type);
    const res = await updateRewardAccountConfig({ accountId, defaultRewardType: type });
    if (res.success) {
      toast.success(type === 'POINTS' ? 'Card now defaults to reward points' : 'Card now defaults to cash');
    } else {
      toast.error(res.error.message);
      void refresh(accountId);
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

  // Both rules and buckets are SSR-provided for the initial account; only refetch
  // when the account changes.
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
    const res = await reorderRewardRules({ accountId, orderedIds: reordered.map((r) => r.id) });
    if (res.success) {
      setRules(res.data);
    } else {
      toast.error(res.error.message);
      void refresh(accountId);
    }
  };

  const remove = async (rule: RewardRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? Historical reports will no longer see it.`)) return;
    const res = await deleteRewardRule(rule.id);
    if (res.success) {
      toast.success('Rule deleted');
      void refresh(accountId);
    } else {
      toast.error(res.error.message);
    }
  };

  /**
   * Devaluation flow: end-date the existing rule today, then open a prefilled
   * create dialog for its successor — history stays intact.
   */
  const endDateAndClone = async (rule: RewardRule) => {
    const today = toCalendarDate(new Date());
    if (rule.activeFrom && rule.activeFrom >= today) {
      toast.error('Rule starts today or later — just edit it directly.');
      return;
    }
    if (rule.activeTo && rule.activeTo <= today) {
      // Never move an existing end date forward — that would retroactively
      // re-activate the rule and rewrite historical reward numbers.
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
    toast.success(`"${rule.name}" ended ${formatDate(today)} — configure its successor`);
    setCloneSource(res.data);
    void refresh(accountId);
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditingRule(undefined);
    setCloneSource(undefined);
  };

  const today = toCalendarDate(new Date());

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', !isMobile && 'flex-wrap')}>
      <Select
        value={accountId}
        onValueChange={(v) => {
          setLoading(true);
          setAccountId(v);
        }}
      >
        <SelectTrigger className={cn(
          'bg-slate-50 dark:bg-slate-950 text-xs h-8 border-slate-200 dark:border-slate-800 rounded-lg font-semibold',
          isMobile ? 'flex-1' : 'w-56',
        )}>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
          {orderedAccounts.map((a) => (
            <SelectItem key={a.id} value={a.id} className="text-xs font-medium">{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
      {!isMobile && <div className="flex-1" />}
      <Button onClick={() => setIsCreateOpen(true)} disabled={!accountId}
              className="rounded-xl h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0">
        <Plus className="w-3.5 h-3.5 mr-1" /> New Rule
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop action bar */}
      <div className="hidden lg:block">{renderActionBar(false)}</div>

      {/* Mobile: controls live in the bottom PageActionBar */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Anniversary anchor — owned by the account (credit-card details), shown read-only */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-3 py-2">
        <CalendarClock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Anniversary date</span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {anniversaryDate ? formatDate(anniversaryDate) : 'Not set'}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Anchors “Per anniversary year” windows and the Rewards overview — set it by editing the card on the{' '}
          <Link href="/accounts" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">Accounts</Link> page.
        </span>
      </div>

      {/* Card-level default reward currency — preselected on every new rule */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-3 py-2">
        <Coins className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Rewards paid as</span>
        <Select value={defaultRewardType} disabled={loading}
                onValueChange={(v) => void saveDefaultRewardType(v as RewardType)}>
          <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs h-8 w-36 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="CASH" className="text-xs font-medium">Cash ₹</SelectItem>
            <SelectItem value="POINTS" className="text-xs font-medium">Reward points</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          The card’s default — each rule can still override it.
        </span>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Rules are evaluated top-down: the first matching <span className="font-semibold">exclusive</span> rule
        pays (falling through when its cap is exhausted); <span className="font-semibold">additive</span> rules
        stack on top. To devalue a rule, end-date it and create a successor — never rewrite history.
      </p>

      {/* Rule cards, evaluation order */}
      {rules.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400 dark:text-slate-500">
          No reward rules on this account yet. Start with a base rule (e.g. “1% on everything”), then add
          category bonuses and exclusions above it.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule, index) => {
            const ended = !!rule.activeTo && rule.activeTo <= today;
            return (
              <div key={rule.id}
                   className={cn(
                     'bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3',
                     ended && 'opacity-55',
                   )}>
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button type="button" aria-label="Move up" onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Move down" onClick={() => move(index, 1)}
                          disabled={index === rules.length - 1}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{rule.name}</span>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                      rule.stacking === 'EXCLUSIVE'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
                    )}>
                      {rule.stacking === 'EXCLUSIVE' ? 'excl' : 'add'}
                    </span>
                    {ended && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-500">
                        ended
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    {accrualSummary(rule)}
                    {capSummary(rule) && <span className="text-slate-400 dark:text-slate-500 font-medium"> · {capSummary(rule)}</span>}
                    {rule.perTxnCap != null && <span className="text-slate-400 dark:text-slate-500 font-medium"> · max {rule.perTxnCap}/txn</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {matchSummary(rule)}
                    <span className="mx-1">·</span>
                    {rule.activeFrom ? formatDate(rule.activeFrom) : 'always'} → {rule.activeTo ? formatDate(rule.activeTo) : 'open'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="icon" aria-label="End-date and clone"
                          title={ended ? 'Already ended — use Clone' : 'End today & clone (devaluation)'}
                          onClick={() => void endDateAndClone(rule)}
                          disabled={ended}
                          className="h-7 w-7 rounded-lg">
                    <CalendarOff className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Clone rule" title="Clone"
                          onClick={() => setCloneSource(rule)}
                          className="h-7 w-7 rounded-lg">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Edit rule" title="Edit"
                          onClick={() => setEditingRule(rule)}
                          className="h-7 w-7 rounded-lg">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Delete rule" title="Delete"
                          onClick={() => void remove(rule)}
                          className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared cap buckets + milestones for the same account */}
      <RewardCapBucketsManager accountId={accountId} buckets={capBuckets} onChanged={() => void refreshBuckets()} />
      <RewardMilestonesManager accountId={accountId} categories={categories} defaultRewardType={defaultRewardType} />

      {(isCreateOpen || editingRule || cloneSource) && (
        <RewardRuleForm
          key={editingRule?.id ?? cloneSource?.id ?? 'create'}
          accountId={accountId}
          categories={categories}
          capBuckets={capBuckets}
          defaultRewardType={defaultRewardType}
          rule={editingRule}
          cloneFrom={cloneSource}
          defaultPriority={(rules.length ? Math.max(...rules.map((r) => r.priority)) : 0) + 1}
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
