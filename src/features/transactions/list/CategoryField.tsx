'use client';

import React from 'react';

import { Icon } from '@/components/ds/Icon/Icon';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import type { CategoryDef } from '@/lib/categoryList.types';
import type { Tag } from '@/lib/tags.types';

import {
  categoryFieldValue,
  type CategoryFilter,
  categoryFilterFromField,
  categorySubtitle,
  filterCategories,
  tagFieldValue,
  type TagFilter,
  tagFilterFromField,
  UNCATEGORIZED_VALUE,
  UNTAGGED_VALUE,
} from './categoryFilterModel';

export interface CategoryFieldProps {
  value: CategoryFilter;
  /** The fixed category list; null while it could not be loaded (the field is then off). */
  categories: readonly CategoryDef[] | null;
  onValueChange: (value: CategoryFilter) => void;
}

/** The Category field: Uncategorized first, then every category with its sub-categories nested under it. */
export function CategoryField({ value, categories, onValueChange }: CategoryFieldProps) {
  const list = React.useMemo(() => categories ?? [], [categories]);
  const options = React.useMemo<SelectOption[]>(
    () => [
      { value: UNCATEGORIZED_VALUE, label: 'Uncategorized' },
      ...filterCategories(list).map((c) => ({
        value: c.key,
        label: c.name,
        icon: <Icon name={c.icon} size="md" />,
        description: categorySubtitle(value, c),
        children: [...c.subs].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => ({ value: s.key, label: s.name })),
      })),
    ],
    [list, value],
  );
  return (
    <Select
      multiple
      searchable
      searchPlaceholder="Search categories"
      label="Category"
      placeholder="Any category"
      disabled={categories === null}
      options={options}
      value={categoryFieldValue(value, list)}
      onValueChange={(v) => onValueChange(categoryFilterFromField(v as string[], list))}
    />
  );
}

export interface TagsFieldProps {
  value: TagFilter;
  /** The user's tags with their counts; null while they could not be loaded (the field is then off). */
  tags: readonly Tag[] | null;
  onValueChange: (value: TagFilter) => void;
}

/** The Tags field: Untagged first, then the tags that carry transactions, with their counts. */
export function TagsField({ value, tags, onValueChange }: TagsFieldProps) {
  const options = React.useMemo<SelectOption[]>(
    () => [
      { value: UNTAGGED_VALUE, label: 'Untagged' },
      ...(tags ?? [])
        .filter((t) => (t.transactionCount ?? 1) > 0 || value.tags.includes(t.id))
        .map((t) => ({ value: t.id, label: t.name, hint: t.transactionCount })),
    ],
    [tags, value.tags],
  );
  return (
    <Select
      multiple
      searchable
      searchPlaceholder="Search tags"
      label="Tags"
      placeholder="Any tag"
      disabled={tags === null}
      options={options}
      value={tagFieldValue(value)}
      onValueChange={(v) => onValueChange(tagFilterFromField(v as string[]))}
    />
  );
}
