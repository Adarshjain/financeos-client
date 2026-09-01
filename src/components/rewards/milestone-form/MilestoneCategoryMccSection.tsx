'use client';

import { Combobox } from '@/components/Combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@/lib/categories.types';

import { inputClass } from './MilestoneBasicsGrid';

interface MilestoneCategoryMccSectionProps {
  categories: Category[];
  includeCategories: Category[];
  setIncludeCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  includeMccs: string;
  setIncludeMccs: (m: string) => void;
  excludeCategories: Category[];
  setExcludeCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  excludeMccs: string;
  setExcludeMccs: (m: string) => void;
}

export function MilestoneCategoryMccSection({
  categories,
  includeCategories,
  setIncludeCategories,
  includeMccs,
  setIncludeMccs,
  excludeCategories,
  setExcludeCategories,
  excludeMccs,
  setExcludeMccs,
}: MilestoneCategoryMccSectionProps) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-2.5">
      <span className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
        Eligible spend — independent from earn rules; leave empty to count everything
      </span>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Count only these categories
        </Label>
        <Combobox
          options={categories}
          value={includeCategories}
          onChange={setIncludeCategories}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Count only these MCCs
        </Label>
        <Input
          value={includeMccs}
          onChange={(e) => setIncludeMccs(e.target.value)}
          placeholder="Comma-separated, e.g. 5812, 5814"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Never count these categories
        </Label>
        <Combobox
          options={categories}
          value={excludeCategories}
          onChange={setExcludeCategories}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Never count these MCCs
        </Label>
        <Input
          value={excludeMccs}
          onChange={(e) => setExcludeMccs(e.target.value)}
          placeholder="e.g. 6513, 6540 (rent, wallet)"
          className={inputClass}
        />
      </div>
    </div>
  );
}
