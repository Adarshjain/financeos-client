'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { showToast } from '@/components/ds/Toast/Toast';
import { TagNameDialog } from '@/components/organisms/TagNameDialog/TagNameDialog';
import { TAG_DELETE_DESCRIPTION } from '@/components/organisms/TagSheet/TagSheet';
import { LoadError } from '@/features/shell/LoadError';
import { formatCount } from '@/lib/format';
import type { Tag } from '@/lib/tags.types';

import { useTagMutations } from '../tags/useTagMutations';

export interface TagsPage {
  rows: Tag[];
  totalElements: number;
}

export interface TagsSectionProps {
  /** The user's tags with their transaction counts; null when they could not be loaded. */
  tags: TagsPage | null;
  reference?: string;
  /** The New tag dialog is open; the top bar's Add menu opens it. */
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}

const countLine = (n: number | null | undefined) =>
  !n ? 'No transactions' : formatCount(n, ['transaction', 'transactions']);

/** The tags on the Tags tab: a row each with its transaction count and a ⋮ (Rename, Delete). */
export function TagsSection({ tags, reference, adding, onAddingChange }: TagsSectionProps) {
  const [renaming, setRenaming] = React.useState<Tag | null>(null);
  const [deleting, setDeleting] = React.useState<Tag | null>(null);
  const mutations = useTagMutations({
    onCreated: () => {
      showToast('Tag added');
      onAddingChange(false);
    },
  });
  const rename = mutations.rename;
  const remove = mutations.remove;

  return (
    <section className="flex flex-col gap-space-8">
      <SectionHeader as="h2" variant="strong" sticky={false} meta={tags?.totalElements}>
        Tags
      </SectionHeader>
      {tags === null ? (
        <LoadError what="tags" reference={reference} />
      ) : tags.rows.length === 0 ? (
        <EmptyState
          title="No tags yet"
          description="A tag is your own label on transactions, like a trip or a project. Add one here, or while you edit a transaction."
          action={{ label: 'New tag', onSelect: () => onAddingChange(true) }}
        />
      ) : (
        <Card>
          {tags.rows.map((tag) => (
            <ListRow
              key={tag.id}
              title={tag.name}
              subtitle={countLine(tag.transactionCount)}
              actions={[
                { id: 'rename', label: 'Rename', onSelect: () => setRenaming(tag) },
                { id: 'delete', label: 'Delete', tone: 'danger', onSelect: () => setDeleting(tag) },
              ]}
            />
          ))}
        </Card>
      )}

      <TagNameDialog
        open={adding}
        onOpenChange={(open) => !mutations.create.isPending && onAddingChange(open)}
        title="New tag"
        submitLabel="Add tag"
        loading={mutations.create.isPending}
        onSubmit={(name) => mutations.create.mutate(name)}
      />
      <TagNameDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && !rename.isPending && setRenaming(null)}
        title="Rename tag"
        initialName={renaming?.name}
        submitLabel="Save name"
        loading={rename.isPending}
        onSubmit={(name) => renaming && rename.mutate({ tag: renaming, name }, { onSuccess: () => setRenaming(null) })}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !remove.isPending && setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : 'Delete tag?'}
        description={TAG_DELETE_DESCRIPTION}
        confirmLabel="Delete tag"
        confirmLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => setDeleting(null) })}
      />
    </section>
  );
}
