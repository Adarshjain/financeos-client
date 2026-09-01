'use client';

import { ChevronDown, Tag } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Category } from '@/lib/categories.types';

interface CategoryMultiSelectProps {
  categories: Category[];
  activeCategories: string[];
  onCategoryToggle: (name: string) => void;
}

export function CategoryMultiSelect({
  categories,
  activeCategories,
  onCategoryToggle,
}: CategoryMultiSelectProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);

  return (
    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeCategories.length > 0 ? 'filter-active' : 'filter'}
          size="pill"
        >
          <Tag className="h-3 w-3 opacity-70" />
          <span>
            {activeCategories.length === 0
              ? 'Category'
              : activeCategories.length === 1
              ? activeCategories[0]
              : `Categories (${activeCategories.length})`}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-xl overflow-hidden">
        <Command>
          <CommandInput placeholder="Search categories..." className="h-9 text-xs" />
          <CommandList className="max-h-56 p-1">
            <CommandEmpty className="py-4 text-xs text-center text-slate-500">
              No category found.
            </CommandEmpty>
            <CommandGroup>
              {categories.map((cat) => {
                const isSelected = activeCategories.includes(cat.name);
                return (
                  <CommandItem
                    key={cat.id}
                    onSelect={() => onCategoryToggle(cat.name)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
