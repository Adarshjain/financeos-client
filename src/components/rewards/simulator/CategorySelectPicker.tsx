'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@/lib/categories.types';

interface CategorySelectPickerProps {
  categories: Category[];
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  categorySearchQuery: string;
  setCategorySearchQuery: (q: string) => void;
}

export function CategorySelectPicker({
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  categorySearchQuery,
  setCategorySearchQuery,
}: CategorySelectPickerProps) {
  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
          Categories ({selectedCategoryIds.length} selected)
        </Label>
        {selectedCategoryIds.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCategoryIds([])}
            className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
          >
            Clear
          </button>
        )}
      </div>
      <Input
        type="text"
        value={categorySearchQuery}
        onChange={(e) => setCategorySearchQuery(e.target.value)}
        placeholder="Search categories..."
        className="h-7 text-xs"
      />
      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="flex items-center space-x-2 text-xs">
            <Checkbox
              id={`cat-${cat.id}`}
              checked={selectedCategoryIds.includes(cat.id)}
              onCheckedChange={() => toggleCategory(cat.id)}
            />
            <label
              htmlFor={`cat-${cat.id}`}
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none truncate"
            >
              {cat.name}
            </label>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-xs text-slate-400 italic">
            {categorySearchQuery
              ? 'No matching categories'
              : 'No categories available'}
          </p>
        )}
      </div>
    </div>
  );
}
