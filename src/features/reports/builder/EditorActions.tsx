'use client';

import React from 'react';

import { Button, Icon, Menu, SelectionBar, Text } from '@/components/ds';

export interface EditorActionsProps {
  /** The draft differs from what is saved: shows the "Unsaved changes" note. */
  dirty: boolean;
  /** A saved report: adds the ⋯ menu (Save as new, Duplicate, Delete). */
  edit: boolean;
  saving: boolean;
  duplicating: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * The editor's bottom bar. The only place the editor touches the bar component, so swapping that component
 * means changing this file alone.
 */
export function EditorActions({ dirty, edit, saving, duplicating, onCancel, onSave, onSaveAsNew, onDuplicate, onDelete }: EditorActionsProps) {
  const hasStart = dirty || edit;
  return (
    <SelectionBar
      className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
      summary={
        hasStart ? (
          <>
            {edit ? (
              <Menu
                align="start"
                trigger={
                  <Button variant="secondary" iconOnly aria-label="More actions">
                    <Icon name="more" size="sm" />
                  </Button>
                }
              >
                <Menu.Item disabled={saving} onSelect={onSaveAsNew}>
                  Save as new
                </Menu.Item>
                <Menu.Item disabled={duplicating} onSelect={onDuplicate}>
                  Duplicate
                </Menu.Item>
                <Menu.Item tone="danger" onSelect={onDelete}>
                  Delete
                </Menu.Item>
              </Menu>
            ) : null}
            {dirty ? (
              <Text variant="label" tone="warning">
                Unsaved changes
              </Text>
            ) : null}
          </>
        ) : undefined
      }
      actions={[
        { id: 'cancel', label: 'Cancel', variant: 'link', onSelect: onCancel },
        { id: 'save', label: edit ? 'Save report' : 'Add report', variant: 'primary', onSelect: onSave, loading: saving },
      ]}
    />
  );
}
