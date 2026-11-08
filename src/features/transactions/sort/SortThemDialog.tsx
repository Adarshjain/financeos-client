'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { CategoryPicker } from '@/components/organisms/CategoryPicker/CategoryPicker';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { formatCount } from '@/lib/format';
import { initialsOf } from '@/lib/format/initials';
import {
  applyUncategorized,
  loadGroupTransactions,
  undoUncategorized,
} from '@/lib/query/actions/uncategorizedActions';
import { useCategoryList } from '@/lib/query/hooks/useCategoryList';
import { useCategoryRecent } from '@/lib/query/hooks/useCategoryRecent';
import { invalidateUncategorizedQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { ApplyUncategorizedResponse, UncategorizedGroup } from '@/lib/uncategorized.types';
import { useAppRouter } from '@/lib/useAppRouter';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { SortGroupDialog } from './SortGroupDialog';
import {
  type GroupChoice,
  groupLine,
  savedWords,
  SORT_FETCH_ALL_SIZE,
  SORT_PAGE_SIZE,
  undoneWords,
} from './sortModel';
import { sortGroupsQuery, sortSummaryQuery } from './sortQueries';

export interface SortThemDialogProps {
  /** Closed: Done or ×. */
  onClose: () => void;
}

/** Every transaction id of a group, a server page at a time. */
async function groupIds(groupKey: string): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 0; ; page += 1) {
    const result = await unwrapAction(loadGroupTransactions(groupKey, page, SORT_FETCH_ALL_SIZE));
    ids.push(...result.content.map((t) => t.id));
    if (page + 1 >= result.totalPages) return ids;
  }
}

function GroupRow({ group, onOpen }: { group: UncategorizedGroup; onOpen: () => void }) {
  return (
    <ListRow
      clickable
      leading={<Avatar variant={group.person ? 'circle' : 'rounded'} initials={initialsOf(group.label)} />}
      title={group.label}
      subtitle={groupLine(group)}
      onClick={onOpen}
      trailing={
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          Choose
        </Button>
      }
    />
  );
}

/**
 * Sort them: the uncategorized transactions in groups (a shop or a person, groups of two or more first, then the one-offs).
 * A group opens to pick its category; "Set for n" applies that group at once and a toast offers Undo. The list then refreshes and
 * the card re-checks whether anything is left. Search narrows the groups by name on the server.
 */
export function SortThemDialog({ onClose }: SortThemDialogProps) {
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const { list } = useCategoryList();
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search, SEARCH_DEBOUNCE_MS).trim();
  const [page, setPage] = React.useState(0);
  // A new search starts on the first page.
  const [seenQ, setSeenQ] = React.useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setPage(0);
  }
  const [openGroup, setOpenGroup] = React.useState<UncategorizedGroup | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [picked, setPicked] = React.useState<CategoryPick | null>(null);
  const [saving, setSaving] = React.useState(false);
  // Save runs a while: nothing may set state after the dialog is gone.
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const direction = openGroup?.direction === 'IN' ? 'IN' : 'OUT';
  const recent = useCategoryRecent(direction, picking);

  const { data, isPending, isError } = useQuery({
    ...sortGroupsQuery(page, q),
    placeholderData: keepPreviousData,
    // Cached rows show at once and are re-read on every open (the prefetch's request is joined while in flight).
    refetchOnMount: 'always',
  });
  // The card carries no number: the title and the one-offs count come from the summary read when the dialog opens.
  const summary = useQuery({ ...sortSummaryQuery(), refetchOnMount: 'always' });
  const count = summary.data?.count;
  const groupCount = summary.data?.groupCount;
  const groups = data?.content.filter((g) => !g.oneOff) ?? [];
  const oneOffs = data?.content.filter((g) => g.oneOff) ?? [];

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    void invalidateUncategorizedQueries(queryClient);
    router.refresh();
  };

  /** Puts a group back as it was: from the toast's Undo, which may outlive this dialog. */
  const undo = async (applied: ApplyUncategorizedResponse, choice: GroupChoice) => {
    try {
      const result = await unwrapAction(
        undoUncategorized({
          transactionIds: applied.updatedIds,
          categoryKey: choice.pick.categoryKey,
          subcategoryKey: choice.pick.subcategoryKey,
          ruleId: applied.ruleId,
          ruleCreated: applied.ruleCreated,
          previousRuleCategoryKey: applied.previousRuleCategoryKey,
          previousRuleSubcategoryKey: applied.previousRuleSubcategoryKey,
          userClearedIds: applied.userClearedIds,
          ruleMerchantKey: applied.ruleMerchantKey,
          ruleMatchType: applied.ruleMatchType,
        }),
      );
      showToast(undoneWords(result.restored, result.skipped));
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't put the categories back. Try again."), { tone: 'danger' });
    }
    refreshAll();
  };

  /** "Set for n": applies one group (its ticked transactions, with the rule when the switch is on), then it leaves the list. */
  const applyGroup = async (group: UncategorizedGroup, choice: GroupChoice) => {
    if (saving) return;
    setSaving(true);
    try {
      const left = new Set(choice.unticked);
      const ids = (await groupIds(group.groupKey)).filter((id) => !left.has(id));
      if (ids.length === 0) return;
      const result = await unwrapAction(
        applyUncategorized({
          transactionIds: ids,
          categoryKey: choice.pick.categoryKey,
          subcategoryKey: choice.pick.subcategoryKey,
          rule: choice.rule ? { pattern: choice.pattern, matchType: 'CONTAINS' } : undefined,
        }),
      );
      showToast(savedWords(result.updated, result.skipped), {
        action: result.updatedIds.length > 0 ? { label: 'Undo', onSelect: () => void undo(result, choice) } : undefined,
      });
      refreshAll();
      if (mounted.current) {
        setOpenGroup(null);
        setPicked(null);
      }
    } catch (e) {
      // The group stays open, with its choice, for another try.
      showToast(getErrorMessage(e, `Couldn't set the category of ${group.label}. Try again.`), { tone: 'danger' });
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  /** Nothing closes the dialog while a group is being set: Done, ×, Escape, the backdrop and a drag down all wait. */
  const close = () => {
    if (!saving) onClose();
  };

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
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
        <Dialog.Content
          size="md"
          dismissible={!saving}
          showClose={!saving}
          title={count === undefined ? 'Some transactions need a category' : `${formatCount(count)} ${count === 1 ? 'needs' : 'need'} a category`}
          description={
            <>
              <span className="desk:hidden">Grouped by who was paid. One choice covers the whole group.</span>
              <span className="max-desk:hidden">
                Grouped by who was paid. Choose a group to see which transactions the choice applies to.
              </span>
            </>
          }
          secondary={{ label: 'Done', onSelect: close, disabled: saving }}
        >
          <Dialog.Body inert={saving}>
            <TextField
              type="search"
              size="md"
              prefix={<Icon name="search" size="sm" />}
              clearable
              clearLabel="Clear search"
              placeholder="Search groups"
              aria-label="Search groups"
              value={search}
              onValueChange={setSearch}
            />
            {pager}
            {isPending || summary.isPending ? (
              <Card>
                {Array.from({ length: 4 }, (_, i) => (
                  <ListRow
                    key={i}
                    title={<Skeleton width="50%" height={14} />}
                    subtitle={<Skeleton width="30%" height={12} />}
                  />
                ))}
              </Card>
            ) : isError || !data ? (
              <Text variant="body" tone="ink-3" as="p">
                Couldn&apos;t load the groups. Try again.
              </Text>
            ) : data.totalElements === 0 ? (
              <EmptyState
                title={q ? 'No groups match' : 'Nothing left to sort'}
                description={q ? `No group has "${q}" in its name.` : 'Every transaction has a category.'}
              />
            ) : (
              <Card>
                {groups.map((g) => (
                  <GroupRow key={g.groupKey} group={g} onOpen={() => !saving && setOpenGroup(g)} />
                ))}
                {oneOffs.length > 0 ? (
                  <SectionHeader variant="band" sticky={false} meta={groupCount === undefined ? undefined : Math.max(0, data.totalElements - groupCount)}>
                    One-offs
                  </SectionHeader>
                ) : null}
                {oneOffs.map((g) => (
                  <GroupRow key={g.groupKey} group={g} onOpen={() => !saving && setOpenGroup(g)} />
                ))}
              </Card>
            )}
            {pager}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      {openGroup ? (
        <SortGroupDialog
          key={openGroup.groupKey}
          group={openGroup}
          categories={list}
          picked={picked}
          onChoose={() => {
            setPicked(null);
            setPicking(true);
          }}
          onSet={(choice) => applyGroup(openGroup, choice)}
          saving={saving}
          onClose={() => {
            setOpenGroup(null);
            setPicked(null);
          }}
        />
      ) : null}
      <CategoryPicker
        open={picking}
        onOpenChange={setPicking}
        categories={list as CategoryDef[]}
        direction={direction}
        recent={recent}
        subtitle={openGroup?.label}
        onPick={setPicked}
      />
    </>
  );
}
