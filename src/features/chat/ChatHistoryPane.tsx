'use client';

import { useMutation } from '@tanstack/react-query';
import React from 'react';

import {
  Card,
  ConfirmDialog,
  Dialog,
  Icon,
  ListRow,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ds';

import { groupConversations, type HistoryRow,MAX_CHATS } from './chatHistory';
import type { ConversationSummary } from './conversation.types';

export const RENAME_FORM_ID = 'chat-rename-form';
export const TITLE_MAX = 120;

export interface ChatHistoryPaneProps {
  conversations: ConversationSummary[];
  /** The open chat, shown highlighted. */
  currentId: string | null;
  /** The chat whose answer is running: its row says "Answering…". */
  answeringId: string | null;
  /** Today in the app zone (YYYY-MM-DD), so the groups read the same on the server and in the browser. */
  today: string;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

/** Recent chats: grouped by day, each with a Rename and Delete chat menu. */
export function ChatHistoryPane({ conversations, currentId, answeringId, today, onOpen, onRename, onDelete }: ChatHistoryPaneProps) {
  const [renaming, setRenaming] = React.useState<HistoryRow | null>(null);
  const [deleting, setDeleting] = React.useState<HistoryRow | null>(null);
  const [name, setName] = React.useState('');
  const groups = groupConversations(conversations, today);
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= TITLE_MAX;

  const startRename = (row: HistoryRow) => {
    setName(row.title);
    setRenaming(row);
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => onRename(id, title),
    onSuccess: (ok) => {
      if (ok) setRenaming(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => onDelete(id),
    onSuccess: (ok) => {
      if (ok) setDeleting(null);
    },
  });
  const pending = renameMutation.isPending || deleteMutation.isPending;

  const submitRename = () => {
    if (!renaming || !valid || pending) return;
    renameMutation.mutate({ id: renaming.id, title: trimmed });
  };

  const confirmDelete = () => {
    if (!deleting || pending) return;
    deleteMutation.mutate(deleting.id);
  };

  return (
    <>
      <Card>
        <Card.Header>
          <div className="min-w-0">
            <Card.Title>Recent chats</Card.Title>
            <Card.Subtitle truncate={false}>{`Your last ${MAX_CHATS} chats are kept. A new chat removes the oldest.`}</Card.Subtitle>
          </div>
        </Card.Header>
        {groups.map((group) => (
          <div key={group.id}>
            <SectionHeader variant="band" className="max-desk:hidden">
              {group.label}
            </SectionHeader>
            {group.rows.map((row) => {
              const answering = row.id === answeringId;
              return (
                <ListRow
                  key={row.id}
                  highlighted={row.id === currentId}
                  leading={answering ? <Icon name="spinner" size="sm" className="animate-spin text-ink-3" /> : undefined}
                  title={row.title}
                  subtitle={
                    answering ? (
                      'Answering…'
                    ) : (
                      <>
                        <span className="desk:hidden">{row.dayPrefix}</span>
                        {row.meta}
                      </>
                    )
                  }
                  clickable
                  onClick={(e) => {
                    // A click inside the row's menu (drawn in a portal) bubbles here through React; it is not a row press.
                    if (e.currentTarget.contains(e.target as Node)) onOpen(row.id);
                  }}
                  actions={[
                    { id: 'rename', label: 'Rename', onSelect: () => startRename(row) },
                    { id: 'delete', label: 'Delete chat', tone: 'danger', onSelect: () => setDeleting(row) },
                  ]}
                />
              );
            })}
          </div>
        ))}
        {groups.length === 0 ? (
          <Text variant="caption" tone="ink-3" as="p" className="p-space-16">
            No chats yet
          </Text>
        ) : null}
      </Card>

      {renaming ? (
        <Dialog open onOpenChange={(open) => (open || pending ? undefined : setRenaming(null))}>
          <Dialog.Content
            size="sm"
            title="Rename chat"
            secondary={{ label: 'Cancel', onSelect: () => setRenaming(null), disabled: pending }}
            primary={{ label: 'Save name', type: 'submit', form: RENAME_FORM_ID, loading: pending, disabled: pending || !valid || trimmed === renaming.title }}
          >
            <Dialog.Body>
              <form
                id={RENAME_FORM_ID}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename();
                }}
              >
                <TextField label="Name" name="title" value={name} maxLength={TITLE_MAX} onChange={(e) => setName(e.target.value)} autoFocus />
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDeleting(null);
          }}
          title={`Delete “${deleting.title}”?`}
          description="The chat and its answers go. Reports you saved from it stay. This can't be undone."
          confirmLabel="Delete chat"
          confirmLoading={pending}
          onConfirm={() => confirmDelete()}
        />
      ) : null}
    </>
  );
}
