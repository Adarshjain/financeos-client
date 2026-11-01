'use client';

import React from 'react';

import { Icon } from '@/components/ds/Icon/Icon';
import type { IconName } from '@/components/ds/Icon/registry';
import { Select } from '@/components/ds/Select/Select';

export interface CategoryFieldProps {
  /** "Food · Delivery", or "Food"; none when no category is set. */
  label?: string;
  icon?: IconName;
  /** The field was pressed: the form opens the category picker. */
  onOpen: () => void;
  helper?: React.ReactNode;
  error?: React.ReactNode;
}

/** The one Category field of the Add/Edit form and the rule form. It reads like a Select, but opens the category picker instead of a list. */
export function CategoryField({ label, icon, onOpen, helper, error }: CategoryFieldProps) {
  return (
    <Select
      label="Category"
      placeholder="Pick a category"
      options={label ? [{ value: 'current', label, icon: icon ? <Icon name={icon} size="sm" /> : undefined }] : []}
      value={label ? 'current' : undefined}
      open={false}
      onOpenChange={(open) => {
        if (open) onOpen();
      }}
      helper={helper}
      error={error}
    />
  );
}
