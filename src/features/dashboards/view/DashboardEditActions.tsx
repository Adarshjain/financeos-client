'use client';

// The editor's bottom bar (the report editor's pattern): Discard (Cancel on a new dashboard) and Save (Create),
// with an "Unsaved changes" note while the draft differs from what is saved.

import React from 'react';

import { SelectionBar, Text } from '@/components/ds';

export interface DashboardEditActionsProps {
  /** A new dashboard: Cancel and Create instead of Discard and Save. */
  creating: boolean;
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function DashboardEditActions({ creating, dirty, saving, onDiscard, onSave }: DashboardEditActionsProps) {
  return (
    <SelectionBar
      className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
      summary={
        dirty ? (
          <Text variant="label" tone="warning">
            Unsaved changes
          </Text>
        ) : undefined
      }
      actions={[
        { id: 'discard', label: creating ? 'Cancel' : 'Discard', variant: 'link', onSelect: onDiscard, disabled: saving },
        { id: 'save', label: creating ? 'Add dashboard' : 'Save dashboard', variant: 'primary', onSelect: onSave, loading: saving },
      ]}
    />
  );
}
