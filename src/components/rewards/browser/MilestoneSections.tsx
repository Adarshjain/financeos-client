'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MilestoneStatus } from '@/lib/rewards.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { milestonePayoutTotal, milestoneProgressText } from './helpers';

function MilestoneRow({ m }: { m: MilestoneStatus }) {
  const pct =
    m.threshold > 0
      ? Math.min(100, Math.round((m.progress / m.threshold) * 100))
      : 0;
  const payout =
    m.rewardType === 'POINTS'
      ? `${m.payoutValue ?? 0} pts`
      : formatMoney(m.payoutValue ?? 0);
  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
          {m.name}
        </span>
        <span
          className={cn(
            'text-2xs font-semibold whitespace-nowrap',
            m.achieved
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {m.achieved
            ? m.payoutType === 'CASH_VALUE'
              ? `Achieved · ${payout}`
              : 'Achieved'
            : m.payoutType === 'CASH_VALUE'
            ? `${payout} at target`
            : 'Tracker'}
        </span>
      </div>
      <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
        {m.windowType === 'ONE_TIME' && 'One-time · '}
        {formatDate(m.windowStart)} – {formatDate(m.windowEnd)}
        {m.achieved &&
          m.payoutDate &&
          ` · credited ${formatDate(m.payoutDate)}`}
      </div>
      {m.achieved ? (
        <div className="mt-1.5 text-2xs text-slate-400 dark:text-slate-500">
          {milestoneProgressText(m)}
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex justify-between text-2xs text-slate-400 dark:text-slate-500 mb-0.5">
            <span>{milestoneProgressText(m)}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneSection({
  title,
  items,
  meta,
  metaClass,
  open,
  onToggle,
}: {
  title: string;
  items: MilestoneStatus[];
  meta: string;
  metaClass: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            {title}
          </h3>
          <Badge variant="outline" size="sm">
            {items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {meta && (
            <span className={cn('text-2xs font-semibold', metaClass)}>
              {meta}
            </span>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>
      {open && (
        <CardContent className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((m, i) => (
            <MilestoneRow
              key={`${m.milestoneId}-${m.windowStart}-${i}`}
              m={m}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface MilestoneSectionsProps {
  milestones: MilestoneStatus[];
  loading: boolean;
  inProgressOpen: boolean;
  setInProgressOpen: React.Dispatch<React.SetStateAction<boolean>>;
  completedOpen: boolean;
  setCompletedOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MilestoneSections({
  milestones,
  loading,
  inProgressOpen,
  setInProgressOpen,
  completedOpen,
  setCompletedOpen,
}: MilestoneSectionsProps) {
  if (milestones.length === 0) return null;

  const milestonesInProgress = milestones.filter((m) => !m.achieved);
  const milestonesCompleted = milestones.filter((m) => m.achieved);
  const inProgressPayout = milestonePayoutTotal(milestonesInProgress);
  const completedPayout = milestonePayoutTotal(milestonesCompleted);

  return (
    <div className={cn('flex flex-col gap-2.5', loading && 'opacity-60')}>
      {milestonesInProgress.length > 0 && (
        <MilestoneSection
          title="Milestones"
          items={milestonesInProgress}
          meta={inProgressPayout && `${inProgressPayout} at target`}
          metaClass="text-slate-400 dark:text-slate-500"
          open={inProgressOpen}
          onToggle={() => setInProgressOpen((o) => !o)}
        />
      )}
      {milestonesCompleted.length > 0 && (
        <MilestoneSection
          title="Completed Milestones"
          items={milestonesCompleted}
          meta={completedPayout}
          metaClass="text-emerald-600 dark:text-emerald-400"
          open={completedOpen}
          onToggle={() => setCompletedOpen((o) => !o)}
        />
      )}
    </div>
  );
}
