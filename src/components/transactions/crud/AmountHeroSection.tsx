'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AmountHeroSectionProps {
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
}

export function AmountHeroSection({ amount, setAmount }: AmountHeroSectionProps) {
  return (
    <div className="flex items-center justify-between gap-3 pl-2">
      <Label className="flex items-center mb-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
        Amount
      </Label>
      <button
        type="button"
        onClick={() => {
          setAmount((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
        }}
        className="w-12 h-12 flex items-center justify-center font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-all select-none active:scale-95 shadow-sm shrink-0"
      >
        +/-
      </button>
      <div className="relative flex-1">
        <span
          className={cn(
            'absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold transition-colors pointer-events-none',
            amount.startsWith('-')
              ? 'text-rose-500'
              : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          ₹
        </span>
        <Input
          id="amount-input"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            const isNegative = val.startsWith('-');
            const cleaned = val.replace(/[^0-9.]/g, '');
            const parts = cleaned.split('.');
            let absoluteVal = parts[0];
            if (parts.length > 1) {
              absoluteVal += '.' + parts.slice(1).join('');
            }
            const newValue = isNegative ? `-${absoluteVal}` : absoluteVal;
            setAmount(newValue);
          }}
          className={cn(
            'pl-9 pr-3 h-12 text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-inner transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 w-full',
            amount.startsWith('-')
              ? 'text-rose-500'
              : 'text-emerald-600 dark:text-emerald-400'
          )}
        />
      </div>
    </div>
  );
}
