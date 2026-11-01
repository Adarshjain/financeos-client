'use client';

import React from 'react';

import { Select } from '@/components/ds/Select/Select';
import type { Tag } from '@/lib/tags.types';

export interface TagsFieldProps {
  tags: Tag[];
  selectedTagIds: string[];
  creating: boolean;
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => void;
}

/** The Tags multi-select of the Add/Edit form. */
export function TagsField({ tags, selectedTagIds, creating, onChange, onCreate }: TagsFieldProps) {
  return (
    <Select
      label="Tags"
      placeholder="Add tags"
      multiple
      searchable
      options={tags.map((t) => ({ value: t.id, label: t.name }))}
      value={selectedTagIds}
      onValueChange={(v) => onChange(v as string[])}
      onCreate={onCreate}
      loading={creating}
    />
  );
}
