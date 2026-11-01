'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Highlight } from '@/components/ds/Highlight/Highlight';
import { Icon } from '@/components/ds/Icon/Icon';
import type { IconName } from '@/components/ds/Icon/registry';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import {
  categoriesForDirection,
  findCategory,
  type MoneyDirection,
  pickLabel,
  subsForDirection,
} from '@/lib/categoryList';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { type CategorySearchResult, searchCategories } from '@/lib/categorySearch';

export interface CategoryPickerProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The fixed category list; the picker shows the part that fits `direction`. */
  categories: CategoryDef[];
  /** Money out (a debit) or money in (a credit). */
  direction?: MoneyDirection;
  /** The transaction's current category and sub-category: marked in the grid, ticked in its list. */
  value?: CategoryPick | null;
  /** A pick saves at once: there is no Use button. The picker closes itself after it. */
  onPick?: (pick: CategoryPick) => void;
  /** Recent one-tap picks, one line that scrolls sideways; hidden when empty. */
  recent?: CategoryPick[];
  title?: string;
  /** The line under the title, e.g. "Swiggy · ₹486.00". */
  subtitle?: string;
  /** The category list opened first (its key), instead of the grid. */
  initialCategoryKey?: string;
  /** The search text to start with. */
  initialQuery?: string;
}

/** The round tinted icon tile of the picker: a gap in Dinero (no round icon exists), composed from tokens. */
function RoundIcon({ icon, large = false, marked = false }: { icon: IconName; large?: boolean; marked?: boolean }) {
  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center rounded-ds-pill',
        large ? 'h-space-56 w-space-56' : 'h-space-40 w-space-40',
        marked ? 'bg-brand text-on-brand' : 'bg-brand-tint text-brand-strong',
      ].join(' ')}
    >
      <Icon name={icon} size="lg" />
    </span>
  );
}

interface BodyProps extends Required<Pick<CategoryPickerProps, 'categories' | 'direction' | 'recent'>> {
  value: CategoryPick | null;
  onPick: (pick: CategoryPick) => void;
  initialCategoryKey?: string;
  initialQuery: string;
}

function PickerBody({ categories, direction, value, recent, onPick, initialCategoryKey, initialQuery }: BodyProps) {
  const list = React.useMemo(() => categoriesForDirection(categories, direction), [categories, direction]);
  const [openKey, setOpenKey] = React.useState<string | null>(initialCategoryKey ?? null);
  const [query, setQuery] = React.useState(initialQuery);
  const opened = findCategory(list, openKey);
  const results = React.useMemo(() => searchCategories(categories, direction, query), [categories, direction, query]);

  const choose = (c: CategoryDef) => {
    setQuery('');
    if (subsForDirection(c, direction).length) setOpenKey(c.key);
    else onPick({ categoryKey: c.key, subcategoryKey: null });
  };
  const chooseResult = (r: CategorySearchResult) => {
    const c = findCategory(list, r.categoryKey);
    if (!c) return;
    if (r.subcategoryKey || !subsForDirection(c, direction).length) onPick({ categoryKey: r.categoryKey, subcategoryKey: r.subcategoryKey });
    else {
      setQuery('');
      setOpenKey(c.key);
    }
  };

  let body: React.ReactNode;
  if (query.trim()) {
    body = results.length ? (
      <div>
        {results.map((r) => {
          const c = findCategory(list, r.categoryKey);
          return (
            <ListRow
              key={`${r.categoryKey}/${r.subcategoryKey ?? ''}`}
              clickable
              flush
              leading={c ? <RoundIcon icon={c.icon} /> : undefined}
              title={r.label}
              subtitle={r.hintWord ? <>&ldquo;<Highlight text={r.hintWord} query={query} />&rdquo;</> : r.hint}
              onClick={() => chooseResult(r)}
            />
          );
        })}
      </div>
    ) : (
      <Text variant="body" tone="ink-3">No match. Try a shop, a person or a word like &ldquo;rent&rdquo;.</Text>
    );
  } else if (opened) {
    // Others is ticked until a sub-category is chosen; it still saves only when tapped.
    const tickedKey = value && value.categoryKey === opened.key ? value.subcategoryKey : null;
    body = (
      <div className="flex flex-col gap-space-8">
        <div className="flex items-center gap-space-12">
          <Button variant="ghost" iconOnly size="md" aria-label="All categories" onClick={() => setOpenKey(null)}>
            <Icon name="chevron-left" size="lg" />
          </Button>
          <RoundIcon icon={opened.icon} large />
          <Text variant="screen-title">{opened.name}</Text>
        </div>
        <div>
          {[...subsForDirection(opened, direction), null].map((s) => (
            <ListRow
              key={s?.key ?? 'others'}
              clickable
              flush
              title={s?.name ?? 'Others'}
              subtitle={s ? undefined : `${opened.name} with no sub-category`}
              trailing={(s?.key ?? null) === tickedKey ? <Icon name="check" size="lg" className="text-brand-strong" /> : undefined}
              onClick={() => onPick({ categoryKey: opened.key, subcategoryKey: s?.key ?? null })}
            />
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-space-12">
        {recent.length ? (
          <div className="flex gap-space-8 overflow-x-auto scrollbar-none">
            {recent.map((r) => (
              <FilterChip key={`${r.categoryKey}/${r.subcategoryKey ?? ''}`} className="shrink-0" onClick={() => onPick(r)}>
                {pickLabel(categories, r)}
              </FilterChip>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-y-space-12 desk:grid-cols-6">
          {list.map((c) => (
            <Button key={c.key} variant="ghost" layout="stacked" className="h-auto w-full" onClick={() => choose(c)}>
              <RoundIcon icon={c.icon} marked={value?.categoryKey === c.key} />
              {c.name}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <TextField
        size="md"
        placeholder="Search"
        aria-label="Search categories"
        prefix={<Icon name="search" size="md" className="text-ink-3" />}
        value={query}
        onValueChange={setQuery}
      />
      {body}
    </>
  );
}

/**
 * The category picker: a Dinero Dialog (a bottom sheet on phone, a dialog on desktop). A grid of the direction's categories
 * with one search line, then a category's sub-categories (Others last) or search results. Any tap on a row saves at once.
 * Reopening shows the current pick; closing changes nothing.
 */
export function CategoryPicker({
  open,
  onOpenChange,
  categories,
  direction = 'OUT',
  value = null,
  onPick,
  recent = [],
  title = 'Category',
  subtitle,
  initialCategoryKey,
  initialQuery = '',
}: CategoryPickerProps) {
  const pick = (picked: CategoryPick) => {
    onPick?.(picked);
    onOpenChange?.(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="md" title={title} description={subtitle}>
        <Dialog.Body>
          <PickerBody
            categories={categories}
            direction={direction}
            value={value}
            recent={recent}
            onPick={pick}
            initialCategoryKey={initialCategoryKey}
            initialQuery={initialQuery}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
