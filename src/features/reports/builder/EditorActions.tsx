'use client';

import React from 'react';

import { Button, Icon, Menu, PageFooter, Text } from '@/components/ds';

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
 * The editor's page footer (PageFooter).
 */
export function EditorActions({ dirty, edit, saving, duplicating, onCancel, onSave, onSaveAsNew, onDuplicate, onDelete }: EditorActionsProps) {
  const hasStart = dirty || edit;
  return (
    <PageFooter
      sticky
      className="mt-space-16"
      primary={{ label: edit ? 'Save report' : 'Add report', onSelect: onSave, loading: saving }}
      secondary={{ label: 'Cancel', onSelect: onCancel }}
    >
      {hasStart ? (
        <div className="flex items-center gap-space-8 pb-space-8">
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
        </div>
      ) : null}
    </PageFooter>
  );
}
