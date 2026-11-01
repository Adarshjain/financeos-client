'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';

const FORM_ID = 'tag-name-form';

export interface TagNameDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** "New tag" or "Rename tag". */
  title: string;
  /** The name it opens with: the tag's current name, or empty. */
  initialName?: string;
  /** The primary action: "Add tag", "Save name". */
  submitLabel: string;
  /** The name was confirmed (trimmed, not empty). */
  onSubmit?: (name: string) => void;
  loading?: boolean;
  /** What the server said, e.g. the name is taken. */
  error?: string;
}

/** One name field in a small dialog: the name of a new tag, or a tag renamed. */
export function TagNameDialog({
  open,
  onOpenChange,
  title,
  initialName = '',
  submitLabel,
  onSubmit,
  loading = false,
  error,
}: TagNameDialogProps) {
  const [name, setName] = React.useState(initialName);
  const [wasOpen, setWasOpen] = React.useState(open);
  // Each time it opens it starts from the given name again.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(initialName);
  }
  const trimmed = name.trim();
  const submit = () => {
    if (trimmed && !loading) onSubmit?.(trimmed);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="sm"
        title={title}
        secondary={{ label: 'Cancel', onSelect: () => onOpenChange?.(false), disabled: loading }}
        primary={{ label: submitLabel, type: 'submit', form: FORM_ID, loading, disabled: loading || trimmed === '' }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <TextField label="Name" name="tagName" value={name} onValueChange={setName} error={error} autoFocus />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
