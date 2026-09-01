'use client';

import { CalendarDays } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { AccountCard } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { RewardMilestone, RewardType } from '@/lib/rewards.types';
import { cn, formatDate, toCalendarDate } from '@/lib/utils';

import {
  MilestoneBasicsGrid,
  selectTriggerClass,
} from './milestone-form/MilestoneBasicsGrid';
import { MilestoneCategoryMccSection } from './milestone-form/MilestoneCategoryMccSection';
import { useRewardMilestoneForm } from './milestone-form/useRewardMilestoneForm';

interface RewardMilestoneFormProps {
  accountId: string;
  cards?: AccountCard[];
  categories: Category[];
  /** The card's default reward currency — preselected for new milestones. */
  defaultRewardType: RewardType;
  milestone?: RewardMilestone;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function RewardMilestoneForm({
  accountId,
  cards,
  categories,
  defaultRewardType,
  milestone,
  open,
  onClose,
  onSaved,
}: RewardMilestoneFormProps) {
  const {
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
  } = useRewardMilestoneForm({
    accountId,
    categories,
    defaultRewardType,
    milestone,
    onSaved,
  });

  const dateTrigger = (date: Date | undefined, placeholder: string) => (
    <button
      type="button"
      className={cn(selectTriggerClass, 'flex items-center gap-1.5 w-auto')}
    >
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {date ? formatDate(toCalendarDate(date)) : placeholder}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isUpdateMode ? 'Edit Milestone' : 'Create Milestone'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          <MilestoneBasicsGrid
            name={name}
            setName={setName}
            windowType={windowType}
            setWindowType={setWindowType}
            cards={cards}
            cardId={cardId}
            setCardId={setCardId}
            setActiveFrom={setActiveFrom}
            setActiveTo={setActiveTo}
            basis={basis}
            setBasis={setBasis}
            threshold={threshold}
            setThreshold={setThreshold}
            minTxnAmount={minTxnAmount}
            setMinTxnAmount={setMinTxnAmount}
            payoutType={payoutType}
            setPayoutType={setPayoutType}
            rewardType={rewardType}
            setRewardType={setRewardType}
            payoutValue={payoutValue}
            setPayoutValue={setPayoutValue}
            payoutTiming={payoutTiming}
            setPayoutTiming={setPayoutTiming}
          />

          <MilestoneCategoryMccSection
            categories={categories}
            includeCategories={includeCategories}
            setIncludeCategories={setIncludeCategories}
            includeMccs={includeMccs}
            setIncludeMccs={setIncludeMccs}
            excludeCategories={excludeCategories}
            setExcludeCategories={setExcludeCategories}
            excludeMccs={excludeMccs}
            setExcludeMccs={setExcludeMccs}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {windowType === 'ONE_TIME' ? 'Offer period' : 'Active'}
            </Label>
            <DatePicker
              date={activeFrom}
              onSelect={setActiveFrom}
              trigger={dateTrigger(
                activeFrom,
                windowType === 'ONE_TIME' ? 'Start (required)' : 'Always'
              )}
            />
            {activeFrom && (
              <button
                type="button"
                onClick={() => setActiveFrom(undefined)}
                className="text-2xs text-slate-400 hover:text-rose-500 font-semibold"
              >
                Clear
              </button>
            )}
            <span className="text-2xs text-slate-400">→</span>
            <DatePicker
              date={activeTo}
              onSelect={setActiveTo}
              trigger={dateTrigger(
                activeTo,
                windowType === 'ONE_TIME' ? 'Deadline (required)' : 'Open-ended'
              )}
            />
            {activeTo && (
              <button
                type="button"
                onClick={() => setActiveTo(undefined)}
                className="text-2xs text-slate-400 hover:text-rose-500 font-semibold"
              >
                Clear
              </button>
            )}
            {windowType === 'ONE_TIME' && (
              <span className="text-2xs text-slate-400 dark:text-slate-500 w-full">
                The offer period IS the one-time window — spend counts from start
                until the day before the deadline.
              </span>
            )}
          </div>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Milestone',
            onClick: onSubmit,
            disabled: isSubmitting,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: onClose,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
