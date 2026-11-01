'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Popover } from '@/components/ds/Popover/Popover';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import type { CategoryDef } from '@/lib/categoryList.types';
import type { Tag } from '@/lib/tags.types';

import {
  categoryChipLabel,
  type CategoryFilter,
  categoryFilterSize,
  categoryRowState,
  categorySubtitle,
  NO_CATEGORY_FILTER,
  sameCategoryFilter,
  subRowState,
  tagChipLabel,
  type TagFilter,
  toggleCategory,
  toggleSub,
  toggleTag,
  toggleUncategorized,
  toggleUntagged,
  visibleCategories,
} from './categoryFilterModel';

const SCROLL = 'flex flex-col flex-1 min-h-0 overflow-y-auto max-h-72 outline-none touch-pan-y max-desk:max-h-none';

function Count({ n }: { n: number | null | undefined }) {
  return n == null ? null : (
    <Text variant="label" tone="ink-3" as="span">
      {n}
    </Text>
  );
}

const noCheck = { tabIndex: -1, 'aria-hidden': true } as const;

export interface CategoryFilterChipProps {
  value: CategoryFilter;
  /** The fixed category list; null while it could not be loaded (the chip is then off). */
  categories: readonly CategoryDef[] | null;
  /** Written once, when the dropdown closes with a change. */
  onCommit: (value: CategoryFilter) => void;
}

/** The Category chip: Uncategorized first, then every category; a chevron narrows to sub-categories. */
export function CategoryFilterChip({ value, categories, onCommit }: CategoryFilterChipProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CategoryFilter | null>(null);
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const list = categories ?? [];
  const shown = draft ?? value;
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSearch('');
      setExpanded(list.filter((c) => c.subs.some((s) => value.subcategories.includes(s.key))).map((c) => c.key));
      return;
    }
    if (draft && !sameCategoryFilter(draft, value)) onCommit(draft);
    setDraft(null);
  };
  const rows = visibleCategories(list, search);
  const toggleOpen = (key: string) => setExpanded((now) => (now.includes(key) ? now.filter((k) => k !== key) : [...now, key]));
  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      list
      trigger={
        <FilterChip
          size="md"
          className="shrink-0"
          hasDropdown
          disabled={categories === null}
          changed={categoryFilterSize(value, list) > 0}
          onReset={() => onCommit(NO_CATEGORY_FILTER)}
        >
          {categoryChipLabel(value, list)}
        </FilterChip>
      }
    >
      <div className="flex w-full flex-col p-space-6">
        <div className="mb-space-8">
          <TextField
            type="search"
            size="md"
            variant="embedded"
            prefix={<Icon name="search" size="sm" />}
            clearable
            placeholder="Search categories"
            aria-label="Search categories"
            value={search}
            onValueChange={setSearch}
          />
        </div>
        <div className={SCROLL}>
          {!search.trim() ? (
            <ListRow
              clickable
              flush
              className="px-space-10"
              leading={<Checkbox checked={shown.uncategorized} {...noCheck} />}
              title="Uncategorized"
              onClick={() => setDraft(toggleUncategorized(shown))}
            />
          ) : null}
          {rows.map(({ category, subs, expand }) => {
            const state = categoryRowState(shown, category);
            const isOpen = expand || expanded.includes(category.key);
            return (
              <React.Fragment key={category.key}>
                <ListRow
                  clickable
                  flush
                  className="px-space-10"
                  leading={<Checkbox checked={state} {...noCheck} />}
                  title={
                    <span className="inline-flex items-center gap-space-8">
                      <Icon name={category.icon} size="md" />
                      {category.name}
                    </span>
                  }
                  subtitle={categorySubtitle(shown, category)}
                  trailing={
                    category.subs.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={isOpen ? 'Hide sub-categories' : 'Show sub-categories'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOpen(category.key);
                        }}
                      >
                        <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size="sm" />
                      </Button>
                    ) : null
                  }
                  onClick={() => setDraft(toggleCategory(shown, category))}
                />
                {isOpen
                  ? subs.map((s) => (
                      <ListRow
                        key={s.key}
                        clickable
                        flush
                        className="pl-space-24 pr-space-10"
                        leading={<Checkbox checked={subRowState(shown, category, s.key)} {...noCheck} />}
                        title={s.name}
                        onClick={() => setDraft(toggleSub(shown, category, s.key))}
                      />
                    ))
                  : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}

export interface TagsFilterChipProps {
  value: TagFilter;
  /** The user's tags with their counts; null while they could not be loaded (the chip is then off). */
  tags: readonly Tag[] | null;
  /** Written once, when the dropdown closes with a change. */
  onCommit: (value: TagFilter) => void;
}

const sameTagFilter = (a: TagFilter, b: TagFilter) =>
  a.untagged === b.untagged && a.tags.length === b.tags.length && a.tags.every((v, i) => v === b.tags[i]);

/** The Tags chip: Untagged first, then the tags that carry transactions, with their counts. */
export function TagsFilterChip({ value, tags, onCommit }: TagsFilterChipProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<TagFilter | null>(null);
  const list = tags ?? [];
  const shown = draft ?? value;
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    if (draft && !sameTagFilter(draft, value)) onCommit(draft);
    setDraft(null);
  };
  const rows = list.filter((t) => (t.transactionCount ?? 1) > 0 || shown.tags.includes(t.id));
  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      list
      trigger={
        <FilterChip
          size="md"
          className="shrink-0"
          hasDropdown
          disabled={tags === null}
          changed={value.untagged || value.tags.length > 0}
          onReset={() => onCommit({ untagged: false, tags: [] })}
        >
          {tagChipLabel(value, list)}
        </FilterChip>
      }
    >
      <div className={`${SCROLL} p-space-6`}>
        <ListRow
          clickable
          flush
          className="px-space-10"
          leading={<Checkbox checked={shown.untagged} {...noCheck} />}
          title="Untagged"
          onClick={() => setDraft(toggleUntagged(shown))}
        />
        {rows.map((t) => (
          <ListRow
            key={t.id}
            clickable
            flush
            className="px-space-10"
            leading={<Checkbox checked={shown.tags.includes(t.id)} {...noCheck} />}
            title={t.name}
            trailing={<Count n={t.transactionCount} />}
            onClick={() => setDraft(toggleTag(shown, t.id))}
          />
        ))}
      </div>
    </Popover>
  );
}
