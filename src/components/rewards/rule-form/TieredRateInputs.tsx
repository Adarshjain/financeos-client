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
import { AccrualType, CapWindow, RewardType } from '@/lib/rewards.types';
import { cn, sanitizeDecimalInput } from '@/lib/utils';

import {
  CAP_WINDOW_LABELS,
  inputClass,
  selectTriggerClass,
} from './constants';

interface TieredRateInputsProps {
  tierWindow: CapWindow;
  setTierWindow: (w: CapWindow) => void;
  tierRows: { upTo: string; rate: string }[];
  setTierRows: React.Dispatch<
    React.SetStateAction<{ upTo: string; rate: string }[]>
  >;
  accrualType: AccrualType;
  rewardType: RewardType;
}

export function TieredRateInputs({
  tierWindow,
  setTierWindow,
  tierRows,
  setTierRows,
  accrualType,
  rewardType,
}: TieredRateInputsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Spend window
        </Label>
        <Select
          value={tierWindow}
          onValueChange={(v) => setTierWindow(v as CapWindow)}
        >
          <SelectTrigger className={cn(selectTriggerClass, 'w-48')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((w) => (
              <SelectItem key={w} value={w} className="text-xs">
                {CAP_WINDOW_LABELS[w]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tierRows.map((tier, index) => {
        const last = index === tierRows.length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="text-2xs text-slate-400 w-10 shrink-0">
              {index === 0 ? 'First' : last ? 'Above' : 'Then'}
            </span>
            {last ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex-1">
                everything beyond
              </span>
            ) : (
              <Input
                inputMode="decimal"
                value={tier.upTo}
                onChange={(e) => {
                  const value = sanitizeDecimalInput(e.target.value);
                  setTierRows((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, upTo: value } : r))
                  );
                }}
                placeholder="up to ₹"
                className={cn(inputClass, 'flex-1')}
              />
            )}
            <Input
              inputMode="decimal"
              value={tier.rate}
              onChange={(e) => {
                const value = sanitizeDecimalInput(e.target.value);
                setTierRows((rows) =>
                  rows.map((r, i) => (i === index ? { ...r, rate: value } : r))
                );
              }}
              placeholder={
                accrualType === 'PERCENT'
                  ? 'rate %'
                  : rewardType === 'POINTS'
                  ? 'pts/slab'
                  : '₹/slab'
              }
              className={cn(inputClass, 'w-24 shrink-0')}
            />
            {!last && tierRows.length > 2 && (
              <button
                type="button"
                aria-label="Remove tier"
                onClick={() =>
                  setTierRows((rows) => rows.filter((_, i) => i !== index))
                }
                className="text-2xs text-slate-400 hover:text-rose-500 font-semibold shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() =>
          setTierRows((rows) => [
            ...rows.slice(0, -1),
            { upTo: '', rate: '' },
            rows[rows.length - 1],
          ])
        }
        className="self-start text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        + Add tier
      </button>
    </div>
  );
}
