// The picker's category switch: a horizontally scrolling chip row on a phone,
// a left rail from `sm` up.

import { Button } from '@/components/ui/button';

import type { PICKER_CATEGORIES, PickerCategory } from './pickerCategories';

interface CategoryNavProps {
  categories: typeof PICKER_CATEGORIES;
  value: PickerCategory;
  onChange: (category: PickerCategory) => void;
}

export function CategoryNav({ categories, value, onChange }: CategoryNavProps) {
  return (
    <nav
      aria-label="Widget categories"
      className="-mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-44 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {categories.map((c) => {
        const active = c.id === value;
        return (
          <Button
            key={c.id}
            type="button"
            variant={active ? 'filter-active' : 'filter'}
            size="pill"
            aria-pressed={active}
            className="sm:w-full sm:justify-start"
            onClick={() => onChange(c.id)}
          >
            {c.label}
          </Button>
        );
      })}
    </nav>
  );
}
