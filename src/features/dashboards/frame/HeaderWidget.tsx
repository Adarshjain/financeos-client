'use client';

// A section header on a dashboard (a "text" widget): its title in plain heading text (no band), and its
// description under it when it has one. It spans the full grid width on every layout.
// While editing it is an interactive grid item: the title and description are fields right on the header.

import React from 'react';

import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { TEXT_DESCRIPTION_MAX, TEXT_TITLE_MAX, textDescription, widgetTitle } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

export interface HeaderWidgetProps {
  widget: WidgetResponse;
  /** The problem with the header, shown at its title field (editing) or beside its title. */
  issue?: string;
  /** Editing: the title and description are fields; a new, untitled header takes focus. */
  onChange?: (change: { title?: string; description?: string }) => void;
}

export function HeaderWidget({ widget, issue, onChange }: HeaderWidgetProps) {
  const description = textDescription(widget);
  if (onChange) {
    return (
      <div className="flex flex-col gap-space-8" data-testid="dashboard-header-edit">
        <TextField
          label="Header"
          placeholder="e.g. This month"
          maxLength={TEXT_TITLE_MAX}
          autoFocus={!widget.title}
          value={widget.title ?? ''}
          error={issue}
          onValueChange={(title) => onChange({ title })}
        />
        <TextField
          label="Description"
          optional
          maxLength={TEXT_DESCRIPTION_MAX}
          value={description}
          onValueChange={(next) => onChange({ description: next })}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-space-2" data-testid="dashboard-header">
      <Text as="h2" variant="heading" tone={issue ? 'danger' : 'ink'}>
        {widgetTitle(widget)}
      </Text>
      {issue ? (
        <Text variant="caption" tone="danger" as="p">
          {issue}
        </Text>
      ) : null}
      {description ? (
        <Text variant="caption" tone="ink-3" as="p">
          {description}
        </Text>
      ) : null}
    </div>
  );
}
