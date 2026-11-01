'use client';

import React from 'react';

import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { TagNameDialog } from '@/components/organisms/TagNameDialog/TagNameDialog';

export interface TagSheetTag {
  id: string;
  name: string;
  /** How many transactions carry it; shown at the end of the row when known. */
  transactionCount?: number | null;
}

/** What deleting a tag does, said before it happens (also used by the Tags page). */
export const TAG_DELETE_DESCRIPTION = 'Deleting a tag removes it from its transactions. Nothing else changes.';

export interface TagSheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** All of the user's tags. */
  tags: TagSheetTag[];
  /** The ticked tags (ids). */
  value: string[];
  /** A row was ticked or unticked. */
  onValueChange?: (ids: string[]) => void;
  title?: string;
  /** The line under the title, e.g. "Swiggy · ₹486.00" or "3 transactions". */
  subtitle?: string;
  /** Typing a name no tag has offers `Create "name"`; pressing it calls this. Without it nothing is offered. */
  onCreate?: (name: string) => void;
  creating?: boolean;
  /** Manage shows when rename or delete is given: a list of the tags with Rename and Delete. */
  onRename?: (tag: TagSheetTag, name: string) => void;
  onDelete?: (tag: TagSheetTag) => void;
  /** A rename or delete is being saved. */
  managing?: boolean;
  /** The search text to start with, and whether Manage starts open (stories). */
  initialQuery?: string;
  initialManaging?: boolean;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function countWord(n: number | null | undefined) {
  return n == null ? null : (
    <Text variant="label" tone="ink-3" as="span">
      {n}
    </Text>
  );
}

/**
 * The tag sheet: find a tag or create one by typing, tick the tags, Done. Manage (inside the sheet) lists the tags to
 * rename or delete. A Dinero Dialog: a bottom sheet on phone, a dialog on desktop. Ticking only reports; saving is the caller's.
 */
export function TagSheet({
  open,
  onOpenChange,
  tags,
  value,
  onValueChange,
  title = 'Tags',
  subtitle,
  onCreate,
  creating = false,
  onRename,
  onDelete,
  managing = false,
  initialQuery = '',
  initialManaging = false,
}: TagSheetProps) {
  const [query, setQuery] = React.useState(initialQuery);
  const [manage, setManage] = React.useState(initialManaging);
  const [renaming, setRenaming] = React.useState<TagSheetTag | null>(null);
  const [deleting, setDeleting] = React.useState<TagSheetTag | null>(null);
  const [wasOpen, setWasOpen] = React.useState(open);
  // Each time it opens it starts at the plain list again.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery(initialQuery);
      setManage(initialManaging);
    }
  }
  const canManage = Boolean(onRename || onDelete);
  const needle = query.trim().toLowerCase();
  const shown = needle ? tags.filter((t) => t.name.toLowerCase().includes(needle)) : tags;
  const offerCreate = Boolean(onCreate) && needle !== '' && !tags.some((t) => sameName(t.name, query));
  const toggle = (id: string) => onValueChange?.(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content
          size="sm"
          title={manage ? 'Manage tags' : title}
          description={manage ? undefined : subtitle}
          tertiary={!manage && canManage ? { label: 'Manage', onSelect: () => setManage(true) } : undefined}
          primary={{ label: 'Done', onSelect: () => (manage ? setManage(false) : onOpenChange?.(false)) }}
        >
          <Dialog.Body>
            {manage ? (
              <div>
                {tags.length === 0 ? (
                  <Text variant="body" tone="ink-3" as="p">
                    No tags yet.
                  </Text>
                ) : null}
                {tags.map((t) => (
                  <ListRow
                    key={t.id}
                    flush
                    title={t.name}
                    trailing={countWord(t.transactionCount)}
                    actions={[
                      ...(onRename ? [{ id: 'rename', label: 'Rename', onSelect: () => setRenaming(t) }] : []),
                      ...(onDelete ? [{ id: 'delete', label: 'Delete', tone: 'danger' as const, onSelect: () => setDeleting(t) }] : []),
                    ]}
                  />
                ))}
              </div>
            ) : (
              <>
                <TextField
                  placeholder={onCreate ? 'Find or create a tag' : 'Find a tag'}
                  aria-label="Find a tag"
                  value={query}
                  clearable
                  onClear={() => setQuery('')}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div>
                  {shown.map((t) => (
                    <ListRow
                      key={t.id}
                      clickable
                      flush
                      onClick={() => toggle(t.id)}
                      leading={<Checkbox checked={value.includes(t.id)} tabIndex={-1} aria-hidden="true" />}
                      title={t.name}
                      trailing={countWord(t.transactionCount)}
                    />
                  ))}
                  {offerCreate ? (
                    <ListRow
                      clickable
                      flush
                      disabled={creating}
                      onClick={() => {
                        onCreate?.(query.trim());
                        setQuery('');
                      }}
                      leading={<Icon name="add" size="md" />}
                      title={`Create "${query.trim()}"`}
                    />
                  ) : null}
                  {shown.length === 0 && !offerCreate ? (
                    <Text variant="body" tone="ink-3" as="p">
                      {tags.length === 0 ? 'No tags yet.' : 'No tag matches.'}
                    </Text>
                  ) : null}
                </div>
              </>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      <TagNameDialog
        open={renaming !== null}
        onOpenChange={(next) => !next && setRenaming(null)}
        title="Rename tag"
        initialName={renaming?.name}
        submitLabel="Save name"
        loading={managing}
        onSubmit={(name) => {
          if (renaming) onRename?.(renaming, name);
          setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : 'Delete tag?'}
        description={TAG_DELETE_DESCRIPTION}
        confirmLabel="Delete tag"
        onConfirm={() => {
          if (deleting) onDelete?.(deleting);
          setDeleting(null);
        }}
      />
    </>
  );
}
