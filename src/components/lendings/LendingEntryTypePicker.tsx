'use client';

import { Label } from '@/components/ui/label';
import { ENTRY_TYPE_LABEL, type LendingEntryType } from '@/lib/lendingEntry';
import { cn } from '@/lib/utils';

interface LendingEntryTypePickerProps {
  value: LendingEntryType;
  onChange: (next: LendingEntryType) => void;
  /** Types the user may pick; the rest render disabled (e.g. direction locked by a linked transaction). */
  enabled?: readonly LendingEntryType[];
  /** Shown under the tiles whenever at least one is disabled. */
  lockedHint?: string;
  /** Radio group name; keep unique per form on a page. */
  name?: string;
  label?: string;
}

const GROUPS: { heading: string; types: LendingEntryType[] }[] = [
  { heading: 'Money out', types: ['lent', 'repaid_by_me'] },
  { heading: 'Money in', types: ['borrowed', 'repaid_to_me'] },
];

/**
 * Four radio tiles for what a ledger entry is: new money lent or borrowed, or a
 * repayment in either direction. Native radios keep it keyboard- and
 * label-addressable; the money-out / money-in grouping mirrors how the entry
 * links to a debit or credit transaction.
 */
export function LendingEntryTypePicker({
  value,
  onChange,
  enabled,
  lockedHint,
  name = 'lendingEntryType',
  label = 'Entry type *',
}: LendingEntryTypePickerProps) {
  const isEnabled = (type: LendingEntryType) => !enabled || enabled.includes(type);
  const anyDisabled = GROUPS.some((g) => g.types.some((t) => !isEnabled(t)));

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {GROUPS.map((group) => (
          <div key={group.heading} className="space-y-1.5">
            <div className="text-2xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.heading}
            </div>
            {group.types.map((type) => {
              const disabled = !isEnabled(type);
              const selected = value === type;
              return (
                <label
                  key={type}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors',
                    selected
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    value={type}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onChange(type)}
                  />
                  <span>{ENTRY_TYPE_LABEL[type]}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      {anyDisabled && lockedHint && (
        <p className="text-2xs text-slate-400">{lockedHint}</p>
      )}
    </div>
  );
}
