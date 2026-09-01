'use client';

import { CreditCard, Tag } from 'lucide-react';

import { Combobox } from '@/components/Combobox';
import { MccInput } from '@/components/forms/MccInput';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';

interface AccountCategorySectionProps {
  accountId: string;
  cardId: string | null;
  setCardId: (id: string | null) => void;
  selectableAccounts: Account[];
  isUpdateMode: boolean;
  hasAccountId: boolean;
  handleAccountChange: (newAccountId: string) => void;
  isCreditCard?: boolean;
  supportsCards?: boolean;
  cardOptions: { id: string; label: string }[];
  localCategories: Category[];
  selectedCategories: Category[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  createCategory: (name: string) => Promise<void>;
  creatingCategory: boolean;
  mcc: string;
  setMcc: (mcc: string) => void;
}

export function AccountCategorySection({
  accountId,
  cardId,
  setCardId,
  selectableAccounts,
  isUpdateMode,
  hasAccountId,
  handleAccountChange,
  isCreditCard,
  supportsCards,
  cardOptions,
  localCategories,
  selectedCategories,
  setSelectedCategories,
  createCategory,
  creatingCategory,
  mcc,
  setMcc,
}: AccountCategorySectionProps) {
  const hasCardSupport = supportsCards ?? isCreditCard ?? false;
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-3">
      {/* Account Selector */}
      <div className="flex gap-2">
        <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          Account
        </Label>
        <Select
          name="accountId"
          value={accountId}
          onValueChange={handleAccountChange}
          required
          disabled={isUpdateMode && hasAccountId}
        >
          <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
            <SelectValue placeholder="Select Account" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {selectableAccounts.map((a) => (
              <SelectItem
                key={a.id}
                value={a.id}
                className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card Selector (only for accounts supporting cards with cards) */}
      {hasCardSupport && cardOptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Card
          </Label>
          <Select
            value={cardId || 'NONE'}
            onValueChange={(val) => setCardId(val === 'NONE' ? null : val)}
          >
            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <SelectValue placeholder="Select Card" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <SelectItem value="NONE" className="text-xs italic text-slate-400">
                Unattributed
              </SelectItem>
              {cardOptions.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category Selector */}
      <div className="flex flex-col gap-1">
        <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          Category
        </Label>
        <Combobox
          options={localCategories}
          value={selectedCategories}
          onChange={setSelectedCategories}
          canCreate
          onCreate={createCategory}
          loading={creatingCategory}
        />
      </div>

      {/* MCC Code Input */}
      <MccInput
        name="mcc"
        value={mcc}
        onChange={setMcc}
        showHelperText={false}
      />
    </div>
  );
}
