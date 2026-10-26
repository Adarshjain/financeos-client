'use client';

import React from 'react';

import {
  Card,
  CardHeader,
  CardSubtitle,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
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
  const [pending, setPending] = React.useState(false);
  const groups = groupConversations(conversations, today);
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= TITLE_MAX;

  const startRename = (row: HistoryRow) => {
    setName(row.title);
    setRenaming(row);
  };

  const submitRename = async () => {
    if (!renaming || !valid || pending) return;
    setPending(true);
    const ok = await onRename(renaming.id, trimmed);
    setPending(false);
    if (ok) setRenaming(null);
  };

  const confirmDelete = async () => {
    if (!deleting || pending) return;
    setPending(true);
    const ok = await onDelete(deleting.id);
    setPending(false);
    if (ok) setDeleting(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Recent chats</CardTitle>
            <CardSubtitle truncate={false}>{`Your last ${MAX_CHATS} chats are kept. A new chat removes the oldest.`}</CardSubtitle>
          </div>
        </CardHeader>
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
                    { id: 'delete', label: 'Delete chat', destructive: true, onSelect: () => setDeleting(row) },
                  ]}
                />
              );
            })}
          </div>
        ))}
        {groups.length === 0 ? (
          <Text variant="caption" tone="ink-3" as="p" className="p-space-16">
            No chats yet.
          </Text>
        ) : null}
      </Card>

      {renaming ? (
        <Dialog open onOpenChange={(open) => (open || pending ? undefined : setRenaming(null))}>
          <DialogContent
            size="sm"
            title="Rename chat"
            secondary={{ label: 'Cancel', onSelect: () => setRenaming(null), disabled: pending }}
            primary={{ label: 'Save', type: 'submit', form: RENAME_FORM_ID, loading: pending, disabled: pending || !valid || trimmed === renaming.title }}
          >
            <DialogBody>
              <form
                id={RENAME_FORM_ID}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRename();
                }}
              >
                <TextField label="Name" name="title" value={name} maxLength={TITLE_MAX} onChange={(e) => setName(e.target.value)} autoFocus />
              </form>
            </DialogBody>
          </DialogContent>
        </Dialog>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDeleting(null);
          }}
          title={`Delete “${deleting.title}”?`}
          description="The chat and its answers go. Reports you saved from it stay."
          confirmLabel="Delete chat"
          confirmLoading={pending}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </>
  );
}
