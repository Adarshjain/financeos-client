'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';

interface CompareCardsPickerProps {
  accounts: Account[];
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function CompareCardsPicker({
  accounts,
  selectedAccountIds,
  setSelectedAccountIds,
}: CompareCardsPickerProps) {
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
          Compare Cards (
          {selectedAccountIds.length === 0
            ? 'All Cards'
            : `${selectedAccountIds.length} selected`}
          )
        </Label>
        {selectedAccountIds.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedAccountIds([])}
            className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
          >
            Clear (All Cards)
          </button>
        )}
      </div>
      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
        {creditCards.map((card) => (
          <div key={card.id} className="flex items-center space-x-2 text-xs">
            <Checkbox
              id={`card-${card.id}`}
              checked={selectedAccountIds.includes(card.id)}
              onCheckedChange={() => toggleAccount(card.id)}
            />
            <label
              htmlFor={`card-${card.id}`}
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none truncate"
            >
              {card.name}
            </label>
          </div>
        ))}
        {creditCards.length === 0 && (
          <p className="text-xs text-slate-400 italic">
            No credit cards available
          </p>
        )}
      </div>
    </div>
  );
}
