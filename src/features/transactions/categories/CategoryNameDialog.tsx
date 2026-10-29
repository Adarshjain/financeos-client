'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, TextField } from '@/components/ds';

const FORM_ID = 'category-name-form';

export interface CategoryNameDialogProps {
  /** The category being renamed; without it the dialog creates one. */
  category?: { id: string; name: string };
  saving: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** New category (from the + on the tab) or Rename category (from a row's actions). */
export function CategoryNameDialog({ category, saving, onSubmit, onClose }: CategoryNameDialogProps) {
  const [name, setName] = React.useState(category?.name ?? '');
  const trimmed = name.trim();
  const unchanged = category !== undefined && trimmed === category.name;
  return (
    <Dialog open onOpenChange={(open) => (open || saving ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title={category ? 'Rename category' : 'Add category'}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{
          label: category ? 'Save category' : 'Add category',
          type: 'submit',
          form: FORM_ID,
          loading: saving,
          disabled: saving || !trimmed || unchanged,
        }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault();
              if (trimmed && !unchanged && !saving) onSubmit(trimmed);
            }}
          >
            <TextField
              label="Name"
              name="name"
              placeholder="e.g. Pets"
              helper={category ? 'Rules and transactions follow the new name.' : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
