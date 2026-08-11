'use client';

import { Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { deleteRewardMilestone, listRewardMilestones } from '@/actions/rewards';
import RewardMilestoneForm from '@/components/rewards/RewardMilestoneForm';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/categories.types';
import type { RewardMilestone, RewardType } from '@/lib/rewards.types';
import { formatMoney } from '@/lib/utils';

const WINDOW_SHORT: Record<string, string> = {
  CALENDAR_MONTH: 'month',
  STATEMENT_CYCLE: 'cycle',
  QUARTER: 'quarter',
  CALENDAR_YEAR: 'year',
  ANNIVERSARY_YEAR: 'card year',
  ONE_TIME: 'one-time',
};

function milestoneSummary(m: RewardMilestone): string {
  const target = m.basis === 'SPEND'
    ? `${formatMoney(m.threshold)} spend`
    : `${m.threshold} txns${m.minTxnAmount ? ` of ${formatMoney(m.minTxnAmount)}+` : ''}`;
  const payout = m.payoutType === 'CASH_VALUE'
    ? `→ ${m.rewardType === 'POINTS' ? `${m.payoutValue ?? 0} pts` : formatMoney(m.payoutValue ?? 0)}${m.payoutTiming === 'ON_ACHIEVEMENT' ? ' on achievement' : ''}`
    : '→ tracker';
  return `${target} / ${WINDOW_SHORT[m.windowType]} ${payout}`;
}

interface RewardMilestonesManagerProps {
  accountId: string;
  categories: Category[];
  /** The card's default reward currency — preselected for new milestones. */
  defaultRewardType: RewardType;
}

/** Milestones list + CRUD for one account — rendered below the rules list. */
export default function RewardMilestonesManager({ accountId, categories, defaultRewardType }: RewardMilestonesManagerProps) {
  const [milestones, setMilestones] = useState<RewardMilestone[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RewardMilestone | undefined>();

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    const res = await listRewardMilestones(id);
    if (res.success) {
      setMilestones(res.data);
    } else {
      toast.error(res.error.message);
    }
  }, []);

  // Milestones are secondary content on the rules page — fetched client-side on
  // mount and whenever the selected account changes.
  const lastAccount = useRef<string | null>(null);
  useEffect(() => {
    if (lastAccount.current === accountId) return;
    lastAccount.current = accountId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(accountId);
  }, [accountId, refresh]);

  const remove = async (milestone: RewardMilestone) => {
    if (!window.confirm(`Delete milestone "${milestone.name}"?`)) return;
    const res = await deleteRewardMilestone(milestone.id);
    if (res.success) {
      toast.success('Milestone deleted');
      void refresh(accountId);
    } else {
      toast.error(res.error.message);
    }
  };

  const closeForm = () => {
    setIsCreateOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Milestones
        </h2>
        <div className="flex-1" />
        <Button onClick={() => setIsCreateOpen(true)} disabled={!accountId} variant="outline"
                className="rounded-lg h-8 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          No milestones yet. Use them for spend targets (“₹1L/quarter → ₹1,000 voucher”), transaction-count
          bonuses (“4 txns of ₹1,500+ → 1,000 pts value”), or annual-fee-waiver trackers.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((milestone) => (
            <div key={milestone.id}
                 className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{milestone.name}</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-500 font-semibold mt-0.5">
                  {milestoneSummary(milestone)}
                </div>
                {(milestone.includeCategoryIds.length > 0 || milestone.includeMccs.length > 0
                  || milestone.excludeCategoryIds.length > 0 || milestone.excludeMccs.length > 0) && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {milestone.includeCategoryIds.length + milestone.includeMccs.length > 0 && 'restricted eligible spend'}
                    {milestone.excludeCategoryIds.length + milestone.excludeMccs.length > 0 && ' · has exclusions'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" aria-label="Edit milestone" title="Edit"
                        onClick={() => setEditing(milestone)} className="h-7 w-7 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Delete milestone" title="Delete"
                        onClick={() => void remove(milestone)}
                        className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(isCreateOpen || editing) && (
        <RewardMilestoneForm
          key={editing?.id ?? 'create'}
          accountId={accountId}
          categories={categories}
          defaultRewardType={defaultRewardType}
          milestone={editing}
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
