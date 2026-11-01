'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
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
  loadUncategorizedGroups,
  loadUncategorizedSummary,
} from '@/lib/query/actions/uncategorizedActions';
import { useCategoryList } from '@/lib/query/hooks/useCategoryList';
import { useCategoryRecent } from '@/lib/query/hooks/useCategoryRecent';
import { keys } from '@/lib/query/keys';
import type { UncategorizedGroup } from '@/lib/uncategorized.types';

import { SortGroupDialog } from './SortGroupDialog';
import {
  groupLine,
  pickWords,
  savedWords,
  saveLabel,
  SORT_FETCH_ALL_SIZE,
  SORT_PAGE_SIZE,
  type StagedGroup,
} from './sortModel';

export interface SortThemDialogProps {
  /** Closed: Later, ×, or after Save. */
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

function GroupRow({
  group,
  staged,
  categories,
  onOpen,
}: {
  group: UncategorizedGroup;
  staged?: StagedGroup;
  categories: readonly CategoryDef[];
  onOpen: () => void;
}) {
  const words = staged ? pickWords(categories, staged.pick) : null;
  return (
    <ListRow
      clickable
      leading={<Avatar variant={group.person ? 'circle' : 'rounded'} initials={initialsOf(group.label)} />}
      title={group.label}
      subtitle={groupLine(group)}
      onClick={onOpen}
      trailing={
        words ? (
          <Badge variant="outline" shape="rounded">
            <span className="inline-flex items-center gap-space-4">
              <Icon name={words.icon} size="xs" />
              {words.label}
            </span>
          </Badge>
        ) : (
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
        )
      }
    />
  );
}

/**
 * Sort them: the uncategorized transactions in groups (a shop or a person, groups of two or more first, then the one-offs).
 * A group opens to pick its category; picks are staged, and Save applies each staged group, then the list refreshes and the card re-checks
 * whether anything is left. Later drops the staged picks.
 */
export function SortThemDialog({ onClose }: SortThemDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { list } = useCategoryList();
  const [page, setPage] = React.useState(0);
  const [staged, setStaged] = React.useState<Record<string, StagedGroup>>({});
  const [openGroup, setOpenGroup] = React.useState<UncategorizedGroup | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [picked, setPicked] = React.useState<CategoryPick | null>(null);
  const [saving, setSaving] = React.useState(false);
  const direction = openGroup?.direction === 'IN' ? 'IN' : 'OUT';
  const recent = useCategoryRecent(direction, picking);

  const { data, isPending, isError } = useQuery({
    queryKey: keys.transactions.uncategorizedGroups(page, SORT_PAGE_SIZE),
    queryFn: () => unwrapAction(loadUncategorizedGroups(page, SORT_PAGE_SIZE)),
    placeholderData: keepPreviousData,
  });
  // The card carries no number: the title and the one-offs count come from the summary read when the dialog opens.
  const summary = useQuery({
    queryKey: keys.transactions.uncategorizedSummary(),
    queryFn: () => unwrapAction(loadUncategorizedSummary()),
  });
  const count = summary.data?.count;
  const groupCount = summary.data?.groupCount;
  const stagedGroups = Object.entries(staged);
  const groups = data?.content.filter((g) => !g.oneOff) ?? [];
  const oneOffs = data?.content.filter((g) => g.oneOff) ?? [];

  const save = async () => {
    setSaving(true);
    let updated = 0;
    let skipped = 0;
    const failed: Record<string, StagedGroup> = {};
    for (const [groupKey, s] of stagedGroups) {
      try {
        const left = new Set(s.unticked);
        const ids = (await groupIds(groupKey)).filter((id) => !left.has(id));
        if (ids.length === 0) continue;
        const result = await unwrapAction(
          applyUncategorized({
            transactionIds: ids,
            categoryKey: s.pick.categoryKey,
            subcategoryKey: s.pick.subcategoryKey,
            rule: s.rule ? { pattern: s.pattern, matchType: 'CONTAINS' } : undefined,
          }),
        );
        updated += result.updated;
        skipped += result.skipped;
      } catch (e) {
        failed[groupKey] = s;
        showToast(getErrorMessage(e, "Couldn't set the categories. Try again."), { tone: 'danger' });
      }
    }
    setSaving(false);
    if (updated > 0 || skipped > 0) showToast(savedWords(updated, skipped));
    void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    router.refresh();
    if (Object.keys(failed).length === 0) onClose();
    else setStaged(failed);
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
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="md"
          title={count === undefined ? 'Some transactions need a category' : `${formatCount(count)} ${count === 1 ? 'needs' : 'need'} a category`}
          description={
            <>
              <span className="desk:hidden">Grouped by who was paid. One choice covers the whole group.</span>
              <span className="max-desk:hidden">
                Grouped by who was paid. Choose a group to see which transactions the choice applies to.
              </span>
            </>
          }
          secondary={{ label: 'Later', onSelect: onClose }}
          primary={{
            label: saveLabel(stagedGroups.length),
            disabled: stagedGroups.length === 0,
            loading: saving,
            onSelect: () => void save(),
          }}
        >
          <Dialog.Body>
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
            ) : (
              <Card>
                {groups.map((g) => (
                  <GroupRow key={g.groupKey} group={g} staged={staged[g.groupKey]} categories={list} onOpen={() => setOpenGroup(g)} />
                ))}
                {oneOffs.length > 0 ? (
                  <SectionHeader variant="band" sticky={false} meta={groupCount === undefined ? undefined : Math.max(0, data.totalElements - groupCount)}>
                    One-offs
                  </SectionHeader>
                ) : null}
                {oneOffs.map((g) => (
                  <GroupRow key={g.groupKey} group={g} staged={staged[g.groupKey]} categories={list} onOpen={() => setOpenGroup(g)} />
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
          staged={staged[openGroup.groupKey]}
          picked={picked}
          onChoose={() => {
            setPicked(null);
            setPicking(true);
          }}
          onSet={(s) => {
            setStaged((now) => ({ ...now, [openGroup.groupKey]: s }));
            setOpenGroup(null);
            setPicked(null);
          }}
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
