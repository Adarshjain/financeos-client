'use client';

import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createRewardMilestone, updateRewardMilestone } from '@/actions/rewards';
import { Combobox } from '@/components/Combobox';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/lib/categories.types';
import type {
  MilestoneBasis,
  MilestonePayoutTiming,
  MilestonePayoutType,
  MilestoneWindow,
  RewardMilestone,
  RewardMilestoneRequest,
  RewardType,
} from '@/lib/rewards.types';
import { cn, formatDate, parseCalendarDate, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

const WINDOW_LABELS: Record<MilestoneWindow, string> = {
  CALENDAR_MONTH: 'Calendar month',
  STATEMENT_CYCLE: 'Statement cycle',
  QUARTER: 'Quarter',
  CALENDAR_YEAR: 'Calendar year',
  ANNIVERSARY_YEAR: 'Anniversary year',
  ONE_TIME: 'One-time (welcome offer)',
};

interface RewardMilestoneFormProps {
  accountId: string;
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
  categories,
  defaultRewardType,
  milestone,
  open,
  onClose,
  onSaved,
}: RewardMilestoneFormProps) {
  const isUpdateMode = !!milestone;

  const [name, setName] = useState(milestone?.name ?? '');
  const [windowType, setWindowType] = useState<MilestoneWindow>(milestone?.windowType ?? 'CALENDAR_MONTH');
  const [basis, setBasis] = useState<MilestoneBasis>(milestone?.basis ?? 'SPEND');
  const [threshold, setThreshold] = useState(milestone?.threshold != null ? String(milestone.threshold) : '');
  const [minTxnAmount, setMinTxnAmount] = useState(
    milestone?.minTxnAmount != null ? String(milestone.minTxnAmount) : '',
  );
  const [payoutType, setPayoutType] = useState<MilestonePayoutType>(milestone?.payoutType ?? 'CASH_VALUE');
  const [rewardType, setRewardType] = useState<RewardType>(milestone?.rewardType ?? defaultRewardType);
  const [payoutValue, setPayoutValue] = useState(
    milestone?.payoutValue != null ? String(milestone.payoutValue) : '',
  );
  const [payoutTiming, setPayoutTiming] = useState<MilestonePayoutTiming>(
    milestone?.payoutTiming ?? 'WINDOW_END',
  );
  // Preserve ids that aren't in the categories prop (e.g. since-deleted categories)
  // so an unrelated edit + save can't silently drop them from the eligibility JSON.
  const toCategoryOptions = (ids: string[]): Category[] =>
    ids.map((id) => categories.find((c) => c.id === id) ?? ({ id, name: 'Unknown category' } as Category));
  const [includeCategories, setIncludeCategories] = useState<Category[]>(
    milestone ? toCategoryOptions(milestone.includeCategoryIds) : [],
  );
  const [excludeCategories, setExcludeCategories] = useState<Category[]>(
    milestone ? toCategoryOptions(milestone.excludeCategoryIds) : [],
  );
  const [includeMccs, setIncludeMccs] = useState(milestone?.includeMccs.join(', ') ?? '');
  const [excludeMccs, setExcludeMccs] = useState(milestone?.excludeMccs.join(', ') ?? '');
  const [activeFrom, setActiveFrom] = useState<Date | undefined>(
    milestone?.activeFrom ? parseCalendarDate(milestone.activeFrom) : undefined,
  );
  const [activeTo, setActiveTo] = useState<Date | undefined>(
    milestone?.activeTo ? parseCalendarDate(milestone.activeTo) : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseMccList = (text: string) => text.split(',').map((m) => m.trim()).filter(Boolean);

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error('Milestone name is required.');
      return;
    }
    const thresholdValue = Number(threshold);
    if (!threshold.trim() || Number.isNaN(thresholdValue) || thresholdValue <= 0) {
      toast.error('Threshold must be a positive number.');
      return;
    }
    if (payoutType === 'CASH_VALUE' && (!payoutValue.trim() || Number(payoutValue) <= 0)) {
      toast.error('Payout value is required for a value-paying milestone.');
      return;
    }
    if (windowType === 'ONE_TIME' && (!activeFrom || !activeTo)) {
      toast.error('A one-time milestone needs both a start date and a deadline.');
      return;
    }
    const badMcc = [...parseMccList(includeMccs), ...parseMccList(excludeMccs)].find((m) => !/^\d{4}$/.test(m));
    if (badMcc) {
      toast.error(`MCC must be a 4-digit code: ${badMcc}`);
      return;
    }
    const body: RewardMilestoneRequest = {
      accountId,
      name: name.trim(),
      windowType,
      basis,
      threshold: thresholdValue,
      minTxnAmount: basis === 'TXN_COUNT' && minTxnAmount.trim() ? Number(minTxnAmount) : null,
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
    setIsSubmitting(true);
    try {
      const res = isUpdateMode && milestone
        ? await updateRewardMilestone(milestone.id, body)
        : await createRewardMilestone(body);
      if (res.success) {
        toast.success(isUpdateMode ? 'Milestone updated' : 'Milestone created');
        onSaved();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectTriggerClass =
    'w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors';
  const inputClass =
    'text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none';

  const dateTrigger = (date: Date | undefined, placeholder: string) => (
    <button type="button" className={cn(selectTriggerClass, 'flex items-center gap-1.5 w-auto')}>
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {date ? formatDate(toCalendarDate(date)) : placeholder}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isUpdateMode ? 'Edit Milestone' : 'Create Milestone'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="e.g. ₹50k quarterly voucher" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Window</Label>
              <Select value={windowType} onValueChange={(v) => setWindowType(v as MilestoneWindow)}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(WINDOW_LABELS) as MilestoneWindow[]).map((w) => (
                    <SelectItem key={w} value={w} className="text-xs">{WINDOW_LABELS[w]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Counts</Label>
              <Select value={basis} onValueChange={(v) => setBasis(v as MilestoneBasis)}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPEND" className="text-xs">Eligible spend (₹)</SelectItem>
                  <SelectItem value="TXN_COUNT" className="text-xs">Transaction count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Threshold {basis === 'SPEND' ? '₹' : '(txns)'}
              </Label>
              <Input inputMode="decimal" value={threshold}
                     onChange={(e) => setThreshold(sanitizeDecimalInput(e.target.value))}
                     placeholder={basis === 'SPEND' ? 'e.g. 50000' : 'e.g. 4'} className={inputClass} />
            </div>
            {basis === 'TXN_COUNT' && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Min txn amount ₹</Label>
                <Input inputMode="decimal" value={minTxnAmount}
                       onChange={(e) => setMinTxnAmount(sanitizeDecimalInput(e.target.value))}
                       placeholder="e.g. 1500 (optional)" className={inputClass} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Payout</Label>
              <Select value={payoutType} onValueChange={(v) => setPayoutType(v as MilestonePayoutType)}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH_VALUE" className="text-xs">Fixed reward (voucher/bonus)</SelectItem>
                  <SelectItem value="INFO_TRACKER" className="text-xs">Tracker only (e.g. fee waiver)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payoutType === 'CASH_VALUE' && (
              <>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Paid as</Label>
                  <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH" className="text-xs">Cash ₹</SelectItem>
                      <SelectItem value="POINTS" className="text-xs">Reward points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Payout value {rewardType === 'POINTS' ? '(pts)' : '₹'}
                  </Label>
                  <Input inputMode="decimal" value={payoutValue}
                         onChange={(e) => setPayoutValue(sanitizeDecimalInput(e.target.value))}
                         placeholder="e.g. 1000" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Credited</Label>
                  <Select value={payoutTiming} onValueChange={(v) => setPayoutTiming(v as MilestonePayoutTiming)}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WINDOW_END" className="text-xs">At window end</SelectItem>
                      <SelectItem value="ON_ACHIEVEMENT" className="text-xs">On achievement date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-2.5">
            <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
              Eligible spend — independent from earn rules; leave empty to count everything
            </span>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Count only these categories</Label>
              <Combobox options={categories} value={includeCategories} onChange={setIncludeCategories} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Count only these MCCs</Label>
              <Input value={includeMccs} onChange={(e) => setIncludeMccs(e.target.value)}
                     placeholder="Comma-separated, e.g. 5812, 5814" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Never count these categories</Label>
              <Combobox options={categories} value={excludeCategories} onChange={setExcludeCategories} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Never count these MCCs</Label>
              <Input value={excludeMccs} onChange={(e) => setExcludeMccs(e.target.value)}
                     placeholder="e.g. 6513, 6540 (rent, wallet)" className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {windowType === 'ONE_TIME' ? 'Offer period' : 'Active'}
            </Label>
            <DatePicker date={activeFrom} onSelect={setActiveFrom}
                        trigger={dateTrigger(activeFrom, windowType === 'ONE_TIME' ? 'Start (required)' : 'Always')} />
            {activeFrom && (
              <button type="button" onClick={() => setActiveFrom(undefined)}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">Clear</button>
            )}
            <span className="text-[10px] text-slate-400">→</span>
            <DatePicker date={activeTo} onSelect={setActiveTo}
                        trigger={dateTrigger(activeTo, windowType === 'ONE_TIME' ? 'Deadline (required)' : 'Open-ended')} />
            {activeTo && (
              <button type="button" onClick={() => setActiveTo(undefined)}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">Clear</button>
            )}
            {windowType === 'ONE_TIME' && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 w-full">
                The offer period IS the one-time window — spend counts from start until the day before the deadline.
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 flex-row">
          <Button variant="outline" type="button" onClick={onClose}
                  className="flex-1 rounded-xl h-9 text-xs font-semibold">
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}
                  className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            {isSubmitting ? 'Saving...' : 'Save Milestone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
