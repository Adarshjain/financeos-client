'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreditLimitPool } from '@/lib/account.types';
import { formatMoney } from '@/lib/utils';

/** The pool picker's value: no shared limit, a new one, or an existing pool's id. */
export type LimitPoolChoice = 'none' | 'new' | (string & {});

export const LIMIT_POOL_NONE = 'none';
export const LIMIT_POOL_NEW = 'new';

interface SharedLimitFieldProps {
  pools: CreditLimitPool[];
  choice: LimitPoolChoice;
  onChoiceChange: (choice: LimitPoolChoice) => void;
  /** The account being edited, when it is already in one of `pools`. */
  currentPoolId?: string | null;
}

const inputClass = 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs';

/**
 * Picks the shared limit a credit card draws on (some banks give several cards one limit), or
 * creates one inline. A chosen or new pool shows its name and limit, both editable; they are
 * submitted as `limitPoolName` / `limitPoolLimit` and apply to every account in the pool.
 */
export function SharedLimitField({ pools, choice, onChoiceChange, currentPoolId }: SharedLimitFieldProps) {
  const selected = pools.find((p) => p.id === choice);
  // Accounts that would share the edited limit besides this one.
  const others = selected ? selected.memberCount - (selected.id === currentPoolId ? 1 : 0) : 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="limitPool" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
        Shared Credit Limit
      </Label>
      <Select value={choice} onValueChange={onChoiceChange}>
        <SelectTrigger id="limitPool" className={`h-9 ${inputClass}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={LIMIT_POOL_NONE} className="text-xs">
            None, this card has its own limit
          </SelectItem>
          {pools.map((pool) => (
            <SelectItem key={pool.id} value={pool.id} className="text-xs">
              {pool.name} · {formatMoney(pool.creditLimit)}
            </SelectItem>
          ))}
          <SelectItem value={LIMIT_POOL_NEW} className="text-xs">
            New shared limit…
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-2xs text-slate-400 dark:text-slate-500">
        Some banks give several cards one limit. Pick the limit this card shares.
      </p>

      {choice !== LIMIT_POOL_NONE ? (
        // Keyed by the choice so switching pools resets the prefilled values.
        <div key={choice} className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="limitPoolName" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Shared Limit Name
            </Label>
            <Input
              id="limitPoolName"
              name="limitPoolName"
              maxLength={150}
              placeholder="e.g. HDFC cards"
              defaultValue={selected?.name ?? ''}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="limitPoolLimit" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Shared Limit Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <Input
                id="limitPoolLimit"
                name="limitPoolLimit"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5,00,000"
                defaultValue={selected?.creditLimit}
                required
                className={`pl-6 ${inputClass}`}
              />
            </div>
          </div>
          {others > 0 ? (
            <p className="col-span-2 text-2xs text-slate-400 dark:text-slate-500">
              Changing the name or amount also changes it for the {others} other{' '}
              {others === 1 ? 'account' : 'accounts'} sharing this limit.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
