'use client';

import React from 'react';

import { Select } from '@/components/ds';
import type { Category } from '@/lib/categories.types';

export interface CategoriesFieldProps {
  categories: Category[];
  selectedCategoryIds: string[];
  creating: boolean;
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => void;
}

/** The Categories multi-select of the Add/Edit form and the Set category dialog. */
export function CategoriesField({ categories, selectedCategoryIds, creating, onChange, onCreate }: CategoriesFieldProps) {
  return (
    <Select
      label="Categories"
      placeholder="Add categories"
      multiple
      searchable
      options={categories.map((c) => ({ value: c.id, label: c.name }))}
      value={selectedCategoryIds}
      onValueChange={(v) => onChange(v as string[])}
      onCreate={onCreate}
      loading={creating}
    />
  );
}
