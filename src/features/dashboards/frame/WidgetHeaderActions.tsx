'use client';

// The trailing end of a widget's header: the ⋮ menu.

import React from 'react';

import { Button, Icon, Menu, MenuItem } from '@/components/ds';

import type { WidgetMenuItemId } from './widgetFrame.model';

const LABELS: Record<WidgetMenuItemId, string> = {
  'edit-report': 'Edit report',
  settings: 'Widget settings',
  duplicate: 'Duplicate as my report',
  'full-page': 'View full page',
  underlying: 'View underlying data',
};

export interface WidgetHeaderActionsProps {
  items: WidgetMenuItemId[];
  /** A duplicate is being saved: that item waits. */
  duplicating?: boolean;
  onSelect: (item: WidgetMenuItemId) => void;
}

export function WidgetHeaderActions({ items, duplicating, onSelect }: WidgetHeaderActionsProps) {
  // An item that opens a dialog runs once the menu has closed: opening a modal while the menu's own modal layer is
  // still going leaves the page with pointer events off after the dialog closes.
  const chosen = React.useRef<WidgetMenuItemId | null>(null);
  return (
    <div className="flex items-center gap-space-8">
      {items.length > 0 ? (
        <Menu
          align="end"
          contentProps={{
            onCloseAutoFocus: (event) => {
              const item = chosen.current;
              chosen.current = null;
              if (item) {
                event.preventDefault();
                onSelect(item);
              }
            },
          }}
          trigger={
            <Button type="button" size="sm" variant="ghost" iconOnly aria-label="Widget options">
              <Icon name="more" size="sm" />
            </Button>
          }
        >
          {items.map((item) => (
            <MenuItem key={item} disabled={item === 'duplicate' && duplicating} onSelect={() => {
                chosen.current = item;
              }}>
              {LABELS[item]}
            </MenuItem>
          ))}
        </Menu>
      ) : null}
    </div>
  );
}
