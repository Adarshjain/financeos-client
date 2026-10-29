'use client';

// The editor's page footer (PageFooter, like the report editor): Discard (Cancel on a new dashboard) and Save (Create),
// with an "Unsaved changes" note while the draft differs from what is saved.

import React from 'react';

import { PageFooter, Text } from '@/components/ds';

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
    <PageFooter
      sticky
      className="mt-space-16"
      primary={{ label: creating ? 'Add dashboard' : 'Save dashboard', onSelect: onSave, loading: saving }}
      secondary={{ label: creating ? 'Cancel' : 'Discard', onSelect: onDiscard, disabled: saving }}
    >
      {dirty ? (
        <Text variant="label" tone="warning" as="p" className="pb-space-8">
          Unsaved changes
        </Text>
      ) : null}
    </PageFooter>
  );
}
