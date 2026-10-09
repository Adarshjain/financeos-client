'use client';

// A row breakdown's arithmetic as a ledger: the start figure, each "+" / "−"
// term, and the bold "=" result that matches the listed value. "info" steps are
// standalone facts (open quantity, latest price…) shown muted, outside the sum.

import { cn } from '@/lib/utils';

import { formatAmount } from './underlying.helpers';
import type { BreakdownStep } from './underlying.types';

const SIGNS: Record<string, string> = {
  add: '+',
  subtract: '−',
  equals: '=',
};

export function BreakdownSteps({ steps }: { steps: BreakdownStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
      {steps.map((step, i) => {
        const isInfo = step.op === 'info';
        const isEquals = step.op === 'equals';
        return (
          <li
            key={`${step.op}-${i}`}
            data-op={step.op}
            className={cn(
              'flex items-start gap-2 px-3 py-2',
              isInfo && 'text-xs text-slate-500',
              isEquals && 'font-semibold text-slate-900 dark:text-white',
            )}
          >
            <span className="w-3 shrink-0 text-center tabular-nums" aria-hidden={!SIGNS[step.op]}>
              {SIGNS[step.op] ?? ''}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">{step.label}</span>
              {step.detail && <span className="block text-xs font-normal text-slate-500">{step.detail}</span>}
            </span>
            {step.amount != null && (
              <span className="shrink-0 tabular-nums">{formatAmount(step.amount, step.format)}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
