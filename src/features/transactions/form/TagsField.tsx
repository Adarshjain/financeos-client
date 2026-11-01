'use client';

import React from 'react';

import { Select } from '@/components/ds/Select/Select';

export interface TagsFieldProps {
  /** The chosen tags' names, joined ("Goa trip, Gifts"); none when no tag is chosen. */
  label?: string;
  /** The field was pressed: the form opens the tag sheet. */
  onOpen: () => void;
}

/** The Tags field of the Add/Edit form. It reads like a Select, but opens the tag sheet instead of a list. */
export function TagsField({ label, onOpen }: TagsFieldProps) {
  return (
    <Select
      label="Tags"
      placeholder="Add tags"
      options={label ? [{ value: 'current', label }] : []}
      value={label ? 'current' : undefined}
      open={false}
      onOpenChange={(open) => {
        if (open) onOpen();
      }}
    />
  );
}
