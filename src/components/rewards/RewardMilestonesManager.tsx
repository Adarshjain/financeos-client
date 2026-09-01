'use client';

import { MoreVertical, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { deleteRewardMilestone, listRewardMilestones } from '@/actions/rewards';
import RewardMilestoneForm from '@/components/rewards/RewardMilestoneForm';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import type { AccountCard } from '@/lib/account.types';
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
  cards?: AccountCard[];
  categories: Category[];
  /** The card's default reward currency — preselected for new milestones. */
  defaultRewardType: RewardType;
  isBank?: boolean;
}

/** Milestones list + CRUD for one account — rendered below the rules list. */
export default function RewardMilestonesManager({ accountId, cards, categories, defaultRewardType, isBank }: RewardMilestonesManagerProps) {
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
        <Button onClick={() => setIsCreateOpen(true)} disabled={!accountId} variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          compact
          icon={Trophy}
          title="No milestones yet"
          description="Use them for spend targets (“₹1L/quarter → ₹1,000 voucher”), transaction-count bonuses (“4 txns of ₹1,500+ → 1,000 pts value”), or annual-fee-waiver trackers."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((milestone) => (
            <div key={milestone.id}
                 className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{milestone.name}</div>
                <div className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-0.5">
                  {milestoneSummary(milestone)}
                </div>
                {(milestone.includeCategoryIds.length > 0 || milestone.includeMccs.length > 0
                  || milestone.excludeCategoryIds.length > 0 || milestone.excludeMccs.length > 0) && (
                  <div className="text-2xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {milestone.includeCategoryIds.length + milestone.includeMccs.length > 0 && 'restricted eligible spend'}
                    {milestone.excludeCategoryIds.length + milestone.excludeMccs.length > 0 && ' · has exclusions'}
                  </div>
                )}
              </div>

              {/* Actions 3-dot dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Milestone actions">
                    <MoreVertical className="w-4 h-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setEditing(milestone)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Milestone
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void remove(milestone)}
                    className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" /> Delete Milestone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {(isCreateOpen || editing) && (
        <RewardMilestoneForm
          key={editing?.id ?? 'create'}
          accountId={accountId}
          cards={cards}
          categories={categories}
          defaultRewardType={defaultRewardType}
          milestone={editing}
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
