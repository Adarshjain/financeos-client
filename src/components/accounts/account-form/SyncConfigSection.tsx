'use client';

import { Calendar, TrendingUp } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { cn } from '@/lib/utils';

import { financialPositions } from './constants';

interface SyncConfigSectionProps {
  account?: Account;
  defaultIngestFromDate?: string;
  excludeFromNetAsset: boolean;
  setExcludeFromNetAsset: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SyncConfigSection({
  account,
  defaultIngestFromDate,
  excludeFromNetAsset,
  setExcludeFromNetAsset,
}: SyncConfigSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
        <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Configurations & Sync
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Financial Position</Label>
          <Select name="financialPosition" defaultValue={account?.financialPosition || 'asset'}>
            <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-none">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              {financialPositions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ingestFromDate" className="text-xs text-slate-600 dark:text-slate-350 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Ingest From Date
          </Label>
          <Input
            id="ingestFromDate"
            name="ingestFromDate"
            type="date"
            defaultValue={defaultIngestFromDate}
            className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs h-9 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <p className="text-2xs text-slate-400 dark:text-slate-500 leading-normal">
            Gmail transactions import from this date. Leave empty to pause Gmail import for this account.
          </p>
        </div>
      </div>

      <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/40 my-1"></div>

      <div className="flex items-center justify-between py-1.5 px-0.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Exclude from Net Asset</span>
          <span className="text-2xs text-slate-400 dark:text-slate-500">Do not include in net asset calculation</span>
        </div>
        <input
          type="hidden"
          name="excludeFromNetAsset"
          value={excludeFromNetAsset ? 'true' : 'false'}
        />
        <button
          type="button"
          onClick={() => setExcludeFromNetAsset((prev) => !prev)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
            excludeFromNetAsset ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-800'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
              excludeFromNetAsset ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  );
}
