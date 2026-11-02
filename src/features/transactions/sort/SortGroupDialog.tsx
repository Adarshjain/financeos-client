'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import { TransactionRow } from '@/components/organisms/TransactionRow/TransactionRow';
import { unwrapAction } from '@/lib/actionResult';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { loadGroupTransactions } from '@/lib/query/actions/uncategorizedActions';
import { keys } from '@/lib/query/keys';
import type { UncategorizedGroup } from '@/lib/uncategorized.types';

import { CategoryField } from '../form/CategoryField';
import {
  type GroupChoice,
  groupLine,
  groupRow,
  pickWords,
  reasonChips,
  rulePattern,
  samePick,
  SORT_PAGE_SIZE,
  tickedCount,
} from './sortModel';

export interface SortGroupDialogProps {
  group: UncategorizedGroup;
  /** The fixed category list. */
  categories: readonly CategoryDef[];
  /** "Something else…", or the Category field, was pressed: the page opens the category picker. */
  onChoose: () => void;
  /** The pick made in the category picker, handed back to the dialog. */
  picked: CategoryPick | null;
  /** "Set for n": applies the group at once; resolves when it is done (the page then closes this dialog). */
  onSet: (choice: GroupChoice) => Promise<void>;
  /** A set is running: nothing closes this dialog until it answers. */
  saving?: boolean;
  /** Closed without setting. */
  onClose: () => void;
}

/**
 * One group of Sort them: the category (reasons first for a person), the transactions it applies to with all ticked, and
 * "Do the same next time". "Set for n" applies the group at once.
 */
export function SortGroupDialog({ group, categories, onChoose, picked, onSet, saving = false, onClose }: SortGroupDialogProps) {
  const [pick, setPick] = React.useState<CategoryPick | null>(null);
  const [rule, setRule] = React.useState(!group.person);
  const [unticked, setUnticked] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(0);
  // A pick made in the category picker lands here.
  const [seenPicked, setSeenPicked] = React.useState(picked);
  if (picked !== seenPicked) {
    setSeenPicked(picked);
    if (picked) setPick(picked);
  }

  const { data, isPending, isError } = useQuery({
    queryKey: keys.transactions.uncategorizedGroup(group.groupKey, page, SORT_PAGE_SIZE),
    queryFn: () => unwrapAction(loadGroupTransactions(group.groupKey, page, SORT_PAGE_SIZE)),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const chips = group.person ? reasonChips(categories, group.direction) : [];
  const ticked = tickedCount(group, unticked);
  const words = pickWords(categories, pick);
  const matchesChip = chips.some((c) => samePick(c.pick, pick));
  const pattern = rulePattern(group);
  const toggle = (id: string, on: boolean) => setUnticked((now) => (on ? now.filter((x) => x !== id) : [...now, id]));
  const pager = data ? (
    <Pager
      variant="compact"
      borderPosition="none"
      className="px-0"
      page={page}
      size={SORT_PAGE_SIZE}
      totalElements={data.totalElements}
      onPageChange={setPage}
    />
  ) : null;

  return (
    <Dialog open onOpenChange={(open) => (open || saving ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        dismissible={!saving}
        showClose={!saving}
        title={group.label}
        description={groupLine(group)}
        footer={
          <ListRow
            flush
            title="Do the same next time"
            subtitle={`Adds a rule: Contains "${pattern}"`}
            trailing={<Switch checked={rule} onCheckedChange={setRule} aria-label="Do the same next time" />}
            wrap
          />
        }
        primary={{
          label: `Set for ${ticked}`,
          disabled: !pick || ticked === 0,
          loading: saving,
          onSelect: () => void (pick && onSet({ pick, rule, pattern, unticked })),
        }}
      >
        <Dialog.Body>
          {group.person ? (
            <div className="flex flex-col gap-space-8">
              <Text variant="body-strong" as="div">
                Why did you pay {group.label.split(' ')[0]}?
              </Text>
              <div className="flex flex-wrap gap-space-6">
                {chips.map((c) => (
                  <FilterChip key={c.label} size="md" selected={samePick(c.pick, pick)} onClick={() => setPick(c.pick)}>
                    {c.label}
                  </FilterChip>
                ))}
                <FilterChip
                  size="md"
                  variant={pick && !matchesChip ? undefined : 'dashed'}
                  selected={Boolean(pick && !matchesChip)}
                  onClick={onChoose}
                >
                  {pick && !matchesChip && words ? words.label : 'Something else…'}
                </FilterChip>
              </div>
            </div>
          ) : (
            <CategoryField label={words?.label} icon={words?.icon} onOpen={onChoose} />
          )}
          <SectionHeader variant="band" sticky={false}>
            Applies to
          </SectionHeader>
          <div>
            {pager}
            {isPending ? (
              Array.from({ length: 3 }, (_, i) => (
                <ListRow
                  key={i}
                  flush
                  title={<Skeleton width="60%" height={14} />}
                  subtitle={<Skeleton width="40%" height={12} />}
                  trailing={<Skeleton width={64} height={14} />}
                />
              ))
            ) : isError || !data ? (
              <Text variant="body" tone="ink-3" as="p">
                Couldn&apos;t load the transactions. Try again.
              </Text>
            ) : (
              data.content.map((t) => {
                const r = groupRow(t);
                const on = !unticked.includes(t.id);
                return (
                  <TransactionRow
                    key={t.id}
                    compact
                    leading={<Checkbox checked={on} onCheckedChange={(next) => toggle(t.id, next === true)} aria-label={`Include ${r.description}, ${r.date}`} />}
                    description={r.description}
                    date={r.date}
                    account={r.account}
                    plastic={r.plastic}
                    amount={r.amount}
                    isCredit={r.isCredit}
                    selected={on}
                  />
                );
              })
            )}
            {pager}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
