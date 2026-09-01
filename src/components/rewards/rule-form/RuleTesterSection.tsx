'use client';

import { Combobox } from '@/components/Combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category } from '@/lib/categories.types';
import { DayOfWeek } from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { cn, sanitizeDecimalInput } from '@/lib/utils';

import {
  CHANNEL_OPTIONS,
  chipClass,
  inputClass,
  selectTriggerClass,
} from './constants';

interface RuleTesterSectionProps {
  categories: Category[];
  previewAmount: string;
  setPreviewAmount: (a: string) => void;
  previewDescription: string;
  setPreviewDescription: (d: string) => void;
  previewMcc: string;
  setPreviewMcc: (m: string) => void;
  previewChannel: TransactionChannel | 'NONE';
  setPreviewChannel: (c: TransactionChannel | 'NONE') => void;
  previewCategories: Category[];
  setPreviewCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  previewEmi: boolean;
  setPreviewEmi: React.Dispatch<React.SetStateAction<boolean>>;
  previewIntl: boolean;
  setPreviewIntl: React.Dispatch<React.SetStateAction<boolean>>;
  preview: { matched: boolean; text: string } | null;
  daysOfWeek: DayOfWeek[];
}

export function RuleTesterSection({
  categories,
  previewAmount,
  setPreviewAmount,
  previewDescription,
  setPreviewDescription,
  previewMcc,
  setPreviewMcc,
  previewChannel,
  setPreviewChannel,
  previewCategories,
  setPreviewCategories,
  previewEmi,
  setPreviewEmi,
  previewIntl,
  setPreviewIntl,
  preview,
  daysOfWeek,
}: RuleTesterSectionProps) {
  return (
    <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex flex-col gap-2.5 min-w-0">
      <span className="text-2xs uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-400">
        Test this rule
      </span>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 min-w-0">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Amount ₹
          </Label>
          <Input
            inputMode="decimal"
            value={previewAmount}
            onChange={(e) =>
              setPreviewAmount(sanitizeDecimalInput(e.target.value))
            }
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Description
          </Label>
          <Input
            value={previewDescription}
            onChange={(e) => setPreviewDescription(e.target.value)}
            placeholder="e.g. SWIGGY BANGALORE"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            MCC
          </Label>
          <Input
            value={previewMcc}
            inputMode="numeric"
            maxLength={4}
            onChange={(e) => setPreviewMcc(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 5812"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Channel
          </Label>
          <Select
            value={previewChannel}
            onValueChange={(v) =>
              setPreviewChannel(v as TransactionChannel | 'NONE')
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" className="text-xs">
                Not set
              </SelectItem>
              {CHANNEL_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-40">
          <Combobox
            options={categories}
            value={previewCategories}
            onChange={setPreviewCategories}
          />
        </div>
        <button
          type="button"
          onClick={() => setPreviewEmi((p) => !p)}
          className={chipClass(previewEmi)}
        >
          EMI
        </button>
        <button
          type="button"
          onClick={() => setPreviewIntl((p) => !p)}
          className={chipClass(previewIntl)}
        >
          Intl
        </button>
      </div>
      <div
        className={cn(
          'text-xs font-semibold break-words',
          preview == null
            ? 'text-slate-400'
            : preview.matched
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-500'
        )}
      >
        {preview?.text ?? 'Enter an amount (and accrual fields) to test.'}
      </div>
      {daysOfWeek.length > 0 && (
        <p className="text-2xs text-slate-400 dark:text-slate-500">
          Note: this rule has day-of-week conditions, which the tester doesn’t
          simulate. Caps aren’t simulated either.
        </p>
      )}
    </div>
  );
}
