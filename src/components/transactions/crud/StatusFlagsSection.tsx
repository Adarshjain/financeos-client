'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReviewType } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

interface StatusFlagsSectionProps {
  isUpdateMode: boolean;
  reviewType: ReviewType;
  setReviewType: (val: ReviewType) => void;
  isExcluded: boolean;
  setIsExcluded: React.Dispatch<React.SetStateAction<boolean>>;
  isMonitored: boolean;
  setIsMonitored: React.Dispatch<React.SetStateAction<boolean>>;
  monitoringReason: string;
  setMonitoringReason: (val: string) => void;
}

export function StatusFlagsSection({
  isUpdateMode,
  reviewType,
  setReviewType,
  isExcluded,
  setIsExcluded,
  isMonitored,
  setIsMonitored,
  monitoringReason,
  setMonitoringReason,
}: StatusFlagsSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-3.5">
      {/* Dropdown for Review Status (Only in edit mode) */}
      {isUpdateMode && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Review Status
          </Label>
          <Select
            name="reviewType"
            value={reviewType}
            onValueChange={(val) => setReviewType(val as ReviewType)}
          >
            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <SelectValue placeholder="Review Status" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <SelectItem
                value="NEEDS_REVIEW"
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Needs Review
              </SelectItem>
              <SelectItem
                value="AUTO_REVIEWED"
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Auto Reviewed
              </SelectItem>
              <SelectItem
                value="MANUALLY_REVIEWED"
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Reviewed
              </SelectItem>
              <SelectItem
                value="NA"
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Not applicable
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom switches for Exclude and Monitor */}
      <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/50">
        {/* Exclude Toggle */}
        <div className="flex items-center justify-between py-0.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Exclude Transaction
            </span>
            <span className="text-2xs text-slate-400 dark:text-slate-500">
              Do not include in reporting and budgets
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isExcluded}
            aria-label="Exclude transaction"
            onClick={() => setIsExcluded((prev) => !prev)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isExcluded ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-800'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                isExcluded ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Monitor Toggle */}
        <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Monitor Transaction
            </span>
            <span className="text-2xs text-slate-400 dark:text-slate-500">
              Track changes and alert on activity
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isMonitored}
            aria-label="Monitor transaction"
            onClick={() => setIsMonitored((prev) => !prev)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isMonitored ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                isMonitored ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Monitoring Reason Input */}
        {isMonitored && (
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <Input
              id="monitoring-reason-input"
              placeholder="Explain why this transaction is being monitored...(Optional)"
              value={monitoringReason}
              onChange={(e) => setMonitoringReason(e.target.value)}
              className="text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
