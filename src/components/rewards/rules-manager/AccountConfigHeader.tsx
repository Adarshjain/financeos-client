'use client';

import { CalendarClock, Coins } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RewardType } from '@/lib/rewards.types';
import { formatDate } from '@/lib/utils';

interface AccountConfigHeaderProps {
  anniversaryDate: string | null;
  defaultRewardType: RewardType;
  loading: boolean;
  onSaveDefaultRewardType: (t: RewardType) => void;
  pointValueInr: string;
  setPointValueInr: (v: string) => void;
  onSavePointValueInr: (v: string) => void;
}

export function AccountConfigHeader({
  anniversaryDate,
  defaultRewardType,
  loading,
  onSaveDefaultRewardType,
  pointValueInr,
  setPointValueInr,
  onSavePointValueInr,
}: AccountConfigHeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-3 py-2">
        <CalendarClock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Anniversary date
        </span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {anniversaryDate ? formatDate(anniversaryDate) : 'Not set'}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-3 py-2">
        <Coins className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Rewards paid as
        </span>
        <Select
          value={defaultRewardType}
          disabled={loading}
          onValueChange={(v) => onSaveDefaultRewardType(v as RewardType)}
        >
          <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs h-7 w-32 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="CASH" className="text-xs font-medium">
              Cash ₹
            </SelectItem>
            <SelectItem value="POINTS" className="text-xs font-medium">
              Reward points
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 px-3 py-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Point Value (₹/pt)
        </span>
        <Input
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="0.25 (default)"
          value={pointValueInr}
          onChange={(e) => setPointValueInr(e.target.value)}
          onBlur={(e) => onSavePointValueInr(e.target.value)}
          className="h-7 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
        />
      </div>
    </div>
  );
}
